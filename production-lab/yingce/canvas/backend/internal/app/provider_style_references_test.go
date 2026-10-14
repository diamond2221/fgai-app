package app

import (
	"strings"
	"testing"
	"yingce/backend/internal/model"
)

func TestStyleReferenceImagesAreOwnedDeduplicatedAndPreserveMedia(t *testing.T) {
	service, db := newProjectSettingsTestService(t)
	resource := model.Resource{ID: "style-owned", UserID: "user-1", Kind: "image", Status: model.ResourceStatusReady, MimeType: "image/webp", Width: 1536, Height: 864, Size: 3210}
	if err := db.Create(&resource).Error; err != nil {
		t.Fatal(err)
	}
	profile := styleProfileDocument{Assets: []styleProfileAsset{{ID: "ref", Kind: "reference", Title: "夜色", Status: "validated", ReferenceResourceIDs: []string{resource.ID, resource.ID}}}}
	input := canvasGenerationInput{Prompt: "英国人物", ReferenceImages: []providerMedia{{StorageKey: "resource:" + resource.ID, MimeType: "image/webp", Width: 1536, Height: 864, Bytes: 3210}}}
	if err := service.appendStyleReferenceImages("user-1", profile, &input); err != nil {
		t.Fatal(err)
	}
	if len(input.ReferenceImages) != 1 || input.ReferenceImages[0].MimeType != "image/webp" || input.ReferenceImages[0].Width != 1536 || input.ReferenceImages[0].Bytes != 3210 {
		t.Fatalf("lost or duplicated media: %#v", input.ReferenceImages)
	}
	if !strings.Contains(input.Prompt, "参考图片1（夜色）") || !strings.Contains(input.Prompt, "不继承") {
		t.Fatalf("missing scoped reference: %s", input.Prompt)
	}
	empty := canvasGenerationInput{}
	if err := service.appendStyleReferenceImages("other-user", profile, &empty); err == nil {
		t.Fatal("other user's image was accepted")
	}
	if len(empty.ReferenceImages) != 0 {
		t.Fatal("unauthorized image appended")
	}
	empty = canvasGenerationInput{}
	if err := service.appendStyleReferenceImages("user-1", profile, &empty); err != nil {
		t.Fatal(err)
	}
	if len(empty.ReferenceImages) != 1 || empty.ReferenceImages[0].MimeType != "image/webp" || empty.ReferenceImages[0].Height != 864 {
		t.Fatalf("server refs not hydrated: %#v", empty.ReferenceImages)
	}
}

func TestStyleReferenceImagesRejectPendingOrNonImage(t *testing.T) {
	service, db := newProjectSettingsTestService(t)
	for _, r := range []model.Resource{{ID: "pending-style", UserID: "user-1", Kind: "image", Status: model.ResourceStatusPending, MimeType: "image/png"}, {ID: "audio-style", UserID: "user-1", Kind: "audio", Status: model.ResourceStatusReady, MimeType: "audio/wav"}} {
		if err := db.Create(&r).Error; err != nil {
			t.Fatal(err)
		}
		p := styleProfileDocument{Assets: []styleProfileAsset{{Kind: "reference", Status: "validated", ReferenceResourceIDs: []string{r.ID}}}}
		input := canvasGenerationInput{}
		if err := service.appendStyleReferenceImages("user-1", p, &input); err == nil {
			t.Fatalf("invalid style accepted: %s", r.ID)
		}
	}
}
