"""Guided drafts must run without treating provenance as model controls."""

import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from app.fg_catalog import manifests_for_fg
from app.persistence.errors import V2PersistenceError
from app.persistence.provider_model_repository import ProviderModelRecord
from app.services import provider_model_catalog
from app.services.model_selection import ModelSelectionService


def selection_service():
    rows = json.loads((Path(__file__).parent / "fixtures/fg-catalog.json").read_text(encoding="utf-8"))
    row = next(row for row in rows if row["id"] == "doubao-seedream-5-0-lite-260128")
    manifest = manifests_for_fg(provider_model_catalog._FG_TEMPLATES, [row])[0]
    record = ProviderModelRecord(
        model_ref=manifest.model_ref, provider_id="volcengine_ark",
        provider_model_id=manifest.provider_model_id, display_name=manifest.display_name,
        capability="image", capability_metadata=manifest.capability_metadata,
        source="trusted", availability="available", unavailable_reason=None,
        catalog_revision=1, created_at="2026-10-11", updated_at="2026-10-11",
    )
    catalog = SimpleNamespace(
        list_models=lambda **_kwargs: [record],
        get_default_records=lambda: {"image": SimpleNamespace(model_ref=record.model_ref, selection_mode="explicit")},
    )
    return ModelSelectionService(catalog), row["profile"]["image"]["size"]["default"]


def guided_parameters(size):
    return {
        "size": size,
        "source_option_id": "option-selected",
        "source_proposal_id": "proposal-product",
        "stage_draft_key": "product-main",
        "requested_run": False,
    }


@pytest.mark.parametrize("mode", ["default", "explicit"])
def test_guided_draft_metadata_does_not_reject_supported_model_parameters(mode):
    service, size = selection_service()
    parameters = guided_parameters(size)
    before = dict(parameters)
    selected = service.validate_selection(
        node_type="image", model_selection_mode=mode,
        model_ref="volcengine_ark:doubao-seedream-5-0-lite-260128" if mode == "explicit" else None,
        parameters=parameters,
    )
    assert selected.provider_model_id == "doubao-seedream-5-0-lite-260128"
    assert parameters == before


@pytest.mark.parametrize("invalid", [{"size": "unsupported-size"}, {"invented_provider_option": True}])
def test_guided_provenance_does_not_relax_actual_model_parameter_validation(invalid):
    service, size = selection_service()
    with pytest.raises(V2PersistenceError) as error:
        service.validate_selection(
            node_type="image", model_selection_mode="default", model_ref=None,
            parameters={**guided_parameters(size), **invalid},
        )
    assert error.value.code == "model_parameter_incompatible"
