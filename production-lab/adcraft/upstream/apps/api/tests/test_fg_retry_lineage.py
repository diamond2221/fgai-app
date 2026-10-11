"""Sequential failed retry attempts are audit history, not parallel owners."""
from types import SimpleNamespace

import pytest
from sqlalchemy import select, update, delete

from app.persistence.agent_canvas_guidance_authority_repository import _execution_leaf
from app.persistence.agent_canvas_operation_envelope_repository import AgentCanvasOperationEnvelopeRepository
from app.persistence.errors import V2PersistenceError
from app.persistence.models import AgentCanvasChatTurnRow, AgentCanvasContinuationOutboxRow
from tests.test_fg_retry_expert_activity import retry_repository


def status(database, turn_id, value):
    with database.engine.begin() as connection:
        connection.execute(update(AgentCanvasChatTurnRow).where(
            AgentCanvasChatTurnRow.turn_id == turn_id).values(status=value))
        connection.execute(update(AgentCanvasContinuationOutboxRow).where(
            AgentCanvasContinuationOutboxRow.continuation_turn_id == turn_id).values(status=value))


def leaf(database):
    with database.engine.connect() as connection:
        rows = connection.execute(select(AgentCanvasContinuationOutboxRow)).mappings().all()
        session = SimpleNamespace(journey=SimpleNamespace(active_action=SimpleNamespace(
            turn_id='failed-turn', action_id='action')))
        return _execution_leaf(connection, 'workflow', session, rows,
            envelopes=AgentCanvasOperationEnvelopeRepository(database))


def attempts(fixture):
    repository, database, retry = fixture
    first = retry('first')
    status(database, first.turn_id, 'failed')
    second = retry('second')
    return database, first, second


def test_latest_retry_is_the_owner_after_earlier_attempt_failed(retry_repository):
    database, first, second = attempts(retry_repository)
    status(database, second.turn_id, 'completed')
    current = leaf(database)
    assert current.leaf_turn_id == second.turn_id
    assert current.leaf_status == 'completed'


@pytest.mark.parametrize('earlier_status', ['queued', 'completed'])
def test_parallel_or_already_completed_sibling_is_still_rejected(retry_repository, earlier_status):
    database, first, second = attempts(retry_repository)
    if earlier_status == 'queued':
        # SQLite already forbids two active retry Turns. Also reject an older
        # failed Turn whose queue is still active instead of treating it as history.
        status(database, second.turn_id, 'completed')
        with database.engine.begin() as connection:
            connection.execute(update(AgentCanvasContinuationOutboxRow).where(
                AgentCanvasContinuationOutboxRow.continuation_turn_id == first.turn_id).values(status='queued'))
    else:
        status(database, first.turn_id, earlier_status)
    with pytest.raises(V2PersistenceError, match='ambiguous'):
        leaf(database)


def test_non_retry_sibling_is_still_rejected(retry_repository):
    database, first, second = attempts(retry_repository)
    with database.engine.begin() as connection:
        connection.execute(update(AgentCanvasChatTurnRow).where(
            AgentCanvasChatTurnRow.turn_id == first.turn_id).values(retry_of_turn_id=None))
    with pytest.raises(V2PersistenceError, match='ambiguous'):
        leaf(database)


def test_missing_retry_continuation_is_still_rejected(retry_repository):
    database, first, second = attempts(retry_repository)
    with database.engine.begin() as connection:
        connection.execute(delete(AgentCanvasContinuationOutboxRow).where(
            AgentCanvasContinuationOutboxRow.continuation_turn_id == first.turn_id))
    with pytest.raises(V2PersistenceError, match='Continuation'):
        leaf(database)
