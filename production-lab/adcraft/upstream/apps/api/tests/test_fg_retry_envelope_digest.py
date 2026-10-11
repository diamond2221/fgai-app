"""A persisted request must remain retryable when JSON object keys are sorted."""
from datetime import datetime, timezone
from hashlib import sha256
from types import SimpleNamespace

import pytest

from app.persistence.agent_canvas_operation_envelope_repository import _canonical_json, _persisted_envelope
from app.persistence.errors import V2PersistenceError
from app.schemas.agent_canvas_capabilities import CapabilityCommandEnvelopeV2
from app.schemas.agent_canvas_conversation import ChatTurnV2, ChatTurnRetryRequestV1
from app.schemas.agent_canvas_creative_session import StyleGuidanceContextV2
from app.schemas.agent_canvas_guidance import ContinuationTurnRetrySnapshotV1
from app.services.chat_turn_retry import ChatTurnRetryService
from tests.test_fg_runtime_manual_retry import delivery


def envelope():
    style = StyleGuidanceContextV2(
        skill_run_id='skill-run', skill_id='cup-style', skill_version='1', package_digest='package',
        creative_direction_snapshot_id='direction', global_guidance='Keep the cup white.', role='product',
    ).model_dump(mode='json', exclude_none=True)
    return CapabilityCommandEnvelopeV2(
        envelope_id='envelope', workflow_id='workflow', conversation_id='chat', source_turn_id='source',
        capability_turn_id='failed-turn', session_id='session', expected_session_revision=1,
        capability_id='product_design', objective='Design cup views.',
        context_snapshot_id='context', context_snapshot_digest='a' * 64,
        requirement_revision_id='requirement', requirement_revision_no=1, requirement_digest='b' * 64,
        requirement_projection_digest='c' * 64,
        requirement_projection={'ledger_revision_id': 'requirement', 'ledger_revision_no': 1,
                                'ledger_digest': 'b' * 64, 'capability_id': 'product_design'},
        style_skill_run_id='skill-run',
        capability_context={'objective': 'Design cup views.', 'reference_summaries': [{
            'source_id': 'cup', 'source_kind': 'node', 'node_type': 'image', 'creative_role': 'product',
            'title': 'Cup', 'status': 'ready', 'input_role': 'product_main', 'required': True,
            'semantic_reference_role': None, 'display_order': 0,
        }]}, style_projection=style, result_contract_name='ProductConceptProposalV1',
        candidate_count=3, reference_plan={'capability_id': 'product_design', 'digest': 'd' * 64},
        agent_request_identity='request', created_at=datetime.now(timezone.utc),
    )


def validate_retry(original, restored):
    now = datetime.now(timezone.utc)
    source = ChatTurnV2(
        turn_id='failed-turn', workflow_id='workflow', conversation_id='chat', status='failed',
        turn_kind='capability', request={}, retryable=True,
        actionable_failure={'failure_class': 'transient', 'retry_scope': 'turn', 'user_action': 'retry'},
        error_code='agent_runtime_unavailable', created_at=now, updated_at=now,
    )
    from app.services.agent_canvas_capability_dispatch import _capability_policy_identity
    snapshot = ContinuationTurnRetrySnapshotV1(
        workflow_id='workflow', conversation_id='chat', session_id='session', workflow_revision=1,
        session_revision=1, journey_stage='product', journey_stage_revision=1, logical_action_id='action',
        root_turn_id='source', operation='capability_command', envelope_id='envelope',
        envelope_digest=sha256(original.model_dump_json().encode()).hexdigest(),
        requirement_revision_id='requirement', requirement_digest='b' * 64, node_revisions={},
        asset_ids=(), response_locale='und', policy_identity_digest=_capability_policy_identity(original),
        skill_identity_digest=sha256(b'skill-run').hexdigest(),
    )
    continuation = delivery()
    session = SimpleNamespace(revision=1, session_id='session', journey=SimpleNamespace(
        stage='product', stage_revision=1, active_action=SimpleNamespace(action_id='action')))
    service = ChatTurnRetryService.__new__(ChatTurnRetryService)
    service._workflows = SimpleNamespace(get_workflow=lambda _: SimpleNamespace(revision=1, nodes=()))
    service._conversations = SimpleNamespace(
        get_turn=lambda _: source, has_committed_storyboard_materialization=lambda _: False,
        get_guidance_session_or_none=lambda _: session,
        get_retry_snapshot=lambda _: snapshot.model_dump(mode='json'),
    )
    service._continuations = SimpleNamespace(
        get_for_turn=lambda _: continuation, list_nonterminal_for_workflow=lambda _: ())
    service._envelopes = SimpleNamespace(get=lambda _: restored)
    service._requirements = SimpleNamespace(get_current=lambda _: SimpleNamespace(
        revision_id='requirement', digest='b' * 64))
    service._asset_resolver = None
    return service.validate('workflow', 'failed-turn', ChatTurnRetryRequestV1(
        expected_workflow_revision=1, expected_session_revision=1))


def roundtrip(value):
    return _persisted_envelope({'envelope_json': _canonical_json(value), 'envelope_id': value.envelope_id,
                               'workflow_id': value.workflow_id, 'turn_id': value.capability_turn_id})


def test_legacy_retry_survives_nested_dictionary_key_order_changes():
    original = envelope()
    restored = roundtrip(original)
    assert original == restored
    assert validate_retry(original, restored)[0].turn_id == 'failed-turn'


def test_new_digest_is_stable_across_persistence_and_detects_changed_values():
    from app.services.agent_canvas_envelope_digest import operation_envelope_digest
    original = envelope()
    restored = roundtrip(original)
    assert operation_envelope_digest(original) == operation_envelope_digest(restored)
    assert operation_envelope_digest(restored.model_copy(update={'objective': 'Changed'})) != operation_envelope_digest(original)


@pytest.mark.parametrize('field', ['objective', 'capability_context', 'style_projection'])
def test_restoring_legacy_order_cannot_accept_changed_request_values(field):
    original = envelope()
    restored = roundtrip(original)
    changed = 'Changed objective' if field == 'objective' else {
        **getattr(restored, field), 'objective' if field == 'capability_context' else 'global_guidance': 'Changed'}
    with pytest.raises(V2PersistenceError, match='snapshot no longer matches'):
        validate_retry(original, restored.model_copy(update={field: changed}))
