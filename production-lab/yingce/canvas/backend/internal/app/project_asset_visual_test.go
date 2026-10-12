package app

import (
	"encoding/json"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"testing"
	"yingce/backend/internal/model"
	"yingce/backend/internal/repository"
)

func TestFGProjectSceneAndPropVisualVersions(t *testing.T) {
	for _, category := range []model.AssetCategory{model.AssetCategoryEnvironment, model.AssetCategoryProp} {
		t.Run(string(category), func(t *testing.T) {
			db, err := gorm.Open(sqlite.Open("file:"+newID()+"?mode=memory&cache=shared"), &gorm.Config{})
			if err != nil {
				t.Fatal(err)
			}
			if err = db.AutoMigrate(&model.Project{}, &model.Asset{}, &model.AssetVersion{}, &model.AssetRepresentation{}, &model.ProjectAssetLink{}, &model.Resource{}, &model.Shot{}, &model.ShotAssetReference{}); err != nil {
				t.Fatal(err)
			}
			project := model.Project{ID: "p", UserID: "owner", Status: model.ProjectStatusActive, Revision: 1}
			asset := model.Asset{ID: "a", UserID: "owner", Kind: "text", Category: category, Title: "雨夜", Status: model.AssetVersionStatusConfirmed, PrimaryVersionID: "v1", PayloadJSON: `{"data":{"content":"旧设定","source":"chapter"}}`}
			version := model.AssetVersion{ID: "v1", AssetID: "a", Version: 1, Status: model.AssetVersionStatusConfirmed, DefinitionJSON: `{"description":"旧设定","lighting":"雨夜"}`}
			for _, value := range []any{&project, &asset, &version, &model.ProjectAssetLink{ID: "l", ProjectID: "p", AssetID: "a"}, &model.Resource{ID: "image", UserID: "owner", Kind: "image", Status: model.ResourceStatusReady}, &model.Resource{ID: "foreign", UserID: "other", Kind: "image", Status: model.ResourceStatusReady}, &model.Resource{ID: "video", UserID: "owner", Kind: "video", Status: model.ResourceStatusReady}} {
				if err = db.Create(value).Error; err != nil {
					t.Fatal(err)
				}
			}
			svc := &Service{repo: repository.New(db)}
			task := model.Task{ID: "visual-task", UserID: "owner", ProjectID: "p", Type: "canvas_image", InputJSON: `{"metadata":{"operation":"project_asset_image","assetId":"a","assetVersionId":"v1"}}`}
			if err := svc.finalizeProjectVisualTask(task, map[string]interface{}{"images": []map[string]interface{}{}}); err == nil {
				t.Fatal("task succeeded before saving an image")
			}
			for _, resource := range []string{"foreign", "video", "missing"} {
				if _, err = svc.UpdateProjectAssetVisual("owner", "p", "a", UpdateProjectAssetVisualRequest{ResourceID: resource}); err == nil {
					t.Fatalf("accepted invalid image %s", resource)
				}
			}
			if _, err = svc.UpdateProjectAssetVisual("other", "p", "a", UpdateProjectAssetVisualRequest{ResourceID: "image"}); err == nil {
				t.Fatal("private project exposed")
			}
			if err := svc.finalizeProjectVisualTask(task, map[string]interface{}{"images": []map[string]interface{}{{"resourceId": "image"}}}); err != nil {
				t.Fatal(err)
			}
			result, err := svc.UpdateProjectAssetVisual("owner", "p", "a", UpdateProjectAssetVisualRequest{ResourceID: "image", VersionID: "v1"})
			if err != nil {
				t.Fatal(err)
			}
			if result.MediaType != "image" || result.StorageKey != "resource:image" || result.VersionCount != 2 || result.Definition["lighting"] != "雨夜" {
				t.Fatalf("visual = %+v", result)
			}
			var old model.AssetVersion
			db.First(&old, "id = ?", "v1")
			if old.DefinitionJSON != version.DefinitionJSON {
				t.Fatal("old definition mutated")
			}
			retry, err := svc.UpdateProjectAssetVisual("owner", "p", "a", UpdateProjectAssetVisualRequest{ResourceID: "image", VersionID: "v1"})
			if err != nil || retry.VersionCount != 2 {
				t.Fatalf("retry duplicated version: %+v %v", retry, err)
			}
			if err := svc.finalizeProjectVisualTask(task, map[string]interface{}{"images": []map[string]interface{}{{"resourceId": "image"}}}); err != nil {
				t.Fatal("recovering the original task failed", err)
			}
			definition := map[string]any{"description": "修改后", "lighting": "雨夜"}
			edited, err := svc.UpdateProjectAssetVisual("owner", "p", "a", UpdateProjectAssetVisualRequest{VersionID: result.PrimaryVersionID, Definition: &definition})
			if err != nil {
				t.Fatal(err)
			}
			if edited.StorageKey != "resource:image" || edited.VersionCount != 3 || edited.PreviewText != "修改后" {
				t.Fatalf("edit lost image: %+v", edited)
			}
			var saved model.Asset
			db.First(&saved, "id = ?", "a")
			var payload map[string]any
			if json.Unmarshal([]byte(saved.PayloadJSON), &payload) != nil {
				t.Fatal("bad payload")
			}
			if _, err = svc.UpdateProjectAssetVisual("owner", "p", "a", UpdateProjectAssetVisualRequest{VersionID: "v1", Definition: &definition}); err == nil {
				t.Fatal("stale version overwrote current")
			}
		})
	}
}
