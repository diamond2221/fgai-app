package app

import (
	"context"
	"testing"
	"yingce/backend/internal/protocol"
)

func TestFGReferenceFeeStages(t *testing.T) {
	for _, stage := range []string{"poll", "download", "upload", "cancel", "cache-create", "cache-delete"} {
		if providerRequestIsBillable("POST", stage) {
			t.Fatalf("%s is not a second generation charge", stage)
		}
	}
	if !providerRequestIsBillable("POST", "create") {
		t.Fatal("generation submission must be recorded")
	}
}
func TestFGWeTokenHostBoundary(t *testing.T) {
	for _, url := range []string{"http://wetoken.ai/v1", "https://wetoken.ai.attacker.test", "https://elsewhere.test", "https://wetoken.ai@elsewhere.test"} {
		if isFGWeToken(url) {
			t.Fatal(url)
		}
	}
	if !isFGWeToken("https://wetoken.ai/v1") {
		t.Fatal("official https origin")
	}
}
func TestFGAssetStatusContract(t *testing.T) {
	id, status, err := fgAssetResponse([]byte(`{"data":{"Id":"asset-fg123","Status":"Active"}}`))
	if err != nil || id != "asset-fg123" || status != "active" {
		t.Fatal(id, status, err)
	}
	if _, _, err = fgAssetResponse([]byte(`{"id":"not-an-asset"}`)); err == nil {
		t.Fatal("invalid provider id")
	}
	request := protocol.GenerationRequest{Capability: protocol.CapabilityVideo, Model: "dreamina-seedance-2-5-filter-off", Images: []protocol.MediaReference{{URL: "http://localhost/private.png"}}}
	if prepareFGWeTokenAssets(context.Background(), providerConfig{BaseURL: "https://wetoken.ai/v1"}, &request, "task-id") == nil {
		t.Fatal("local reference cannot be sent to the asset library")
	}
}
func TestFGImageReferencesUseEdits(t *testing.T) {
	spec := protocol.RequestSpec{Path: "/v1/images/generations", Body: map[string]any{"prompt": "retain identity"}}
	req := protocol.GenerationRequest{Images: []protocol.MediaReference{{URL: "https://media.example/image.png"}, {Role: "mask", DataURL: "data:image/png;base64,AQ=="}}}
	err := prepareFGWeTokenImageEdit(providerConfig{BaseURL: "https://wetoken.ai/v1", InterfaceType: "openai-image"}, req, &spec)
	if err != nil || spec.Path != "/v1/images/edits" || !spec.OriginPath || spec.ContentType != "application/json" || len(spec.Files) != 0 {
		t.Fatal(spec, err)
	}
	body := spec.Body.(map[string]any)
	images := creationMaps(body["images"])
	if len(images) != 1 || images[0]["image_url"] != "https://media.example/image.png" {
		t.Fatal("JSON image references required", body)
	}
	mask, _ := body["mask"].(map[string]any)
	if mask["image_url"] != "data:image/png;base64,AQ==" {
		t.Fatal("mask reference missing", body)
	}
	unchanged := protocol.RequestSpec{Path: "/v1/images/generations"}
	_ = prepareFGWeTokenImageEdit(providerConfig{BaseURL: "https://other.example", InterfaceType: "openai-image"}, req, &unchanged)
	if unchanged.Path != "/v1/images/generations" {
		t.Fatal("other providers must remain unchanged")
	}
}
