"""Stable request digests with exact, value-preserving legacy compatibility."""
import hashlib
import hmac
import json

from pydantic import BaseModel

from app.schemas.agent_canvas_capabilities import CapabilityCommandEnvelopeV2
from app.schemas.agent_canvas_creative_session import StyleGuidanceContextV2


def canonical_envelope_json(envelope: BaseModel) -> str:
    return json.dumps(envelope.model_dump(mode='json'), ensure_ascii=True,
                      separators=(',', ':'), sort_keys=True)


def operation_envelope_digest(envelope: BaseModel) -> str:
    return hashlib.sha256(canonical_envelope_json(envelope).encode('utf-8')).hexdigest()


def operation_envelope_digest_matches(envelope: BaseModel, expected: str) -> bool:
    if hmac.compare_digest(operation_envelope_digest(envelope), expected):
        return True
    # Older snapshots hashed insertion order, while SQLite stored sorted keys.
    if hmac.compare_digest(hashlib.sha256(envelope.model_dump_json().encode()).hexdigest(), expected):
        return True
    if not isinstance(envelope, CapabilityCommandEnvelopeV2):
        return False
    try:
        context = _ordered(envelope.capability_context, (
            'objective', 'character_target', 'character_occurrence', 'reference_summaries', 'audit'))
        if 'audit' in context:
            context['audit'] = _ordered(context['audit'], (
                'requirement_revision_id', 'requirement_revision_no', 'requirement_digest',
                'included_directive_ids', 'omitted_directives', 'reference_plan_digest',
                'style_projection_digest', 'capability_context_digest', 'projection_digest'))
        if 'reference_summaries' in context:
            context['reference_summaries'] = [_ordered(value, (
                'source_id', 'source_kind', 'node_type', 'creative_role', 'title', 'status',
                'display_name', 'media_type', 'checksum', 'input_role', 'required',
                'semantic_reference_role', 'display_order')) for value in context['reference_summaries']]
        style = (StyleGuidanceContextV2.model_validate(envelope.style_projection)
                 .model_dump(mode='json', exclude_none=True)) if envelope.style_projection else {}
        legacy = envelope.model_copy(update={'capability_context': context, 'style_projection': style})
    except (TypeError, ValueError, AttributeError):
        return False
    # Compatibility may reorder keys only. It cannot normalise or discard values.
    if canonical_envelope_json(legacy) != canonical_envelope_json(envelope):
        return False
    return hmac.compare_digest(hashlib.sha256(legacy.model_dump_json().encode()).hexdigest(), expected)


def _ordered(value: dict, keys: tuple[str, ...]) -> dict:
    return {**{key: value[key] for key in keys if key in value},
            **{key: item for key, item in value.items() if key not in keys}}
