"""Product source acceptance must survive synthetic turns and collaborator polling."""
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest
from sqlalchemy import insert

import app.fg_context as identity
from app.persistence.agent_canvas_guided_product_repository import AgentCanvasGuidedProductRepository
from app.persistence.database import create_v2_database
from app.persistence.event_repository import EventRepository
from app.persistence.models import (
    AgentCanvasChatTurnRow, AgentCanvasConversationRow, AgentCanvasGuidanceAwaitingRow,
    AgentCanvasGuidanceSessionRow, AgentCanvasGuidedInteractionRow, AgentCanvasWorkflowRow,
    ProjectRow,
)
from app.schemas.agent_canvas_guided_interactions import (
    GuidedInteractionV1, GuidedProductSourceQuestionV1, GuidedProductSourceSubmitV1,
)
from app.schemas.agent_canvas_production_journey import GuidedProductionJourneyV2


@pytest.fixture
def product_acceptance(v2_media_data_dir: Path, tmp_path: Path, monkeypatch):
    monkeypatch.setattr(identity, 'Path', lambda _: tmp_path / 'attribution')
    database = create_v2_database(v2_media_data_dir)
    now = datetime.now(timezone.utc)
    stamp = now.isoformat()
    question = GuidedProductSourceQuestionV1(
        input_kind='multiview', question_id='multiview', prompt='Provide cup views',
        expected_guidance_revision=8, min_asset_count=2, max_asset_count=8,
    )
    interaction = GuidedInteractionV1(
        interaction_id='product-choice', workflow_id='workflow', session_id='session',
        checkpoint_id='product-multiview', kind='product_source', status='open',
        response_locale='zh-CN', expected_session_revision=8, revision=1,
        title='Product source', context='Select cup views', content=question,
        allowed_actions=('select_source',), submit_path='/submit', created_at=now, updated_at=now,
    )
    with database.engine.begin() as connection:
        connection.execute(insert(ProjectRow).values(
            project_id='project', name='Cup', created_at=stamp, updated_at=stamp))
        connection.execute(insert(AgentCanvasWorkflowRow).values(
            workflow_id='workflow', project_id='project', created_at=stamp, updated_at=stamp))
        connection.execute(insert(AgentCanvasConversationRow).values(
            conversation_id='chat', workflow_id='workflow', created_at=stamp, updated_at=stamp))
        connection.execute(insert(AgentCanvasChatTurnRow).values(
            turn_id='synthetic-source', conversation_id='chat', workflow_id='workflow',
            turn_kind='guidance_advance', status='completed', request_json='{}',
            idempotency_key='synthetic', created_at=stamp, updated_at=stamp))
        connection.execute(insert(AgentCanvasGuidanceSessionRow).values(
            session_id='session', workflow_id='workflow', status='active',
            response_locale='zh-CN', creative_goal_json='{}', element_decisions_json='[]',
            completion_json='{}', journey_state_json=GuidedProductionJourneyV2(
                stage='product', stage_revision=4).model_dump_json(),
            revision=8, created_at=stamp, updated_at=stamp))
        values = interaction.model_dump(exclude={'content', 'allowed_actions', 'created_at', 'updated_at'})
        connection.execute(insert(AgentCanvasGuidedInteractionRow).values(
            **values, content_json=question.model_dump_json(), allowed_actions_json='["select_source"]',
            created_at=stamp, updated_at=stamp))
        connection.execute(insert(AgentCanvasGuidanceAwaitingRow).values(
            awaiting_id='awaiting', workflow_id='workflow', session_id='session',
            checkpoint_id='product-multiview', kind='product_source', requires_user_action=True,
            resume_policy='submit_interaction', interaction_id='product-choice', node_ids_json='[]',
            stage='product', stage_revision=4, created_at=stamp))
    repository = AgentCanvasGuidedProductRepository(SimpleNamespace(database=database), EventRepository(database))
    queued = []
    request = GuidedProductSourceSubmitV1(
        submission_kind='product_source', expected_interaction_revision=1, expected_session_revision=8,
        action={'input_kind': 'multiview', 'choice': 'generate', 'question_id': 'multiview',
                'expected_guidance_revision': 8},
    )

    def submit(writer=None):
        return repository.submit_generate(
            workflow_id='workflow', interaction=interaction, request=request,
            submission_id='submission', idempotency_key='submit-product',
            continuation_writer=writer or (lambda connection, **kwargs: queued.append(kwargs['continuation'])),
        )

    try:
        yield submit, queued
    finally:
        database.dispose()


def test_product_generate_freezes_accepted_identity_before_queue_commit(product_acceptance):
    submit, queued = product_acceptance
    def observe_queue(connection, **kwargs):
        continuation = kwargs['continuation']
        stored = identity.work_context(continuation.continuation_turn_id, {'workspace': 'company-project'})
        assert stored.get('actor') == 'accepted-author'
        queued.append(continuation)

    token = identity.fg_context.set({'workspace': 'company-project', 'actor': 'accepted-author'})
    try:
        submit(observe_queue)
    finally:
        identity.fg_context.reset(token)
    continuation = queued[0]
    assert continuation.source_turn_id == 'synthetic-source'
    # Recovery has only the workspace and another collaborator's current request.
    polling = {'workspace': 'company-project', 'actor': 'polling-author'}
    recovered = identity.continuation_context(
        continuation.source_turn_id, continuation.continuation_turn_id, polling)
    assert recovered.get('actor') == 'accepted-author'
    # An idempotent replay must not replace accepted attribution or queue twice.
    token = identity.fg_context.set(polling)
    try:
        assert submit().replayed
    finally:
        identity.fg_context.reset(token)
    assert len(queued) == 1
    assert identity.work_context(continuation.continuation_turn_id, {'workspace': 'company-project'})['actor'] == 'accepted-author'


def test_product_generate_without_identity_never_adopts_the_polling_actor(product_acceptance):
    submit, queued = product_acceptance
    token = identity.fg_context.set({'workspace': 'company-project'})
    try:
        submit()
    finally:
        identity.fg_context.reset(token)
    continuation = queued[0]
    recovered = identity.continuation_context(
        continuation.source_turn_id, continuation.continuation_turn_id,
        {'workspace': 'company-project', 'actor': 'polling-author'})
    assert not recovered.get('actor')


def test_identity_storage_failure_rolls_back_product_acceptance(product_acceptance, monkeypatch):
    submit, queued = product_acceptance
    original = identity.work_context

    def unavailable(*_):
        raise OSError('Attribution storage unavailable')

    token = identity.fg_context.set({'workspace': 'company-project', 'actor': 'accepted-author'})
    try:
        monkeypatch.setattr(identity, 'work_context', unavailable)
        with pytest.raises(OSError, match='Attribution storage unavailable'):
            submit()
        assert queued == []
        monkeypatch.setattr(identity, 'work_context', original)
        assert not submit().replayed
    finally:
        identity.fg_context.reset(token)
    assert len(queued) == 1
