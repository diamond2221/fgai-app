package repository

import (
	"errors"
	"path/filepath"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"yingce/backend/internal/model"
)

func TestFGProjectCharacterAccessFollowsProjectScope(t *testing.T) {
	t.Setenv("CANVAS_FG_TEAM_WORKSPACE", "true")
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "characters.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, _ := db.DB()
	defer sqlDB.Close()
	sqlDB.SetMaxOpenConns(1)
	if err = db.AutoMigrate(&model.Project{}, &model.Asset{}, &model.ProjectAssetLink{}, &model.AssetVersion{}, &model.AssetRepresentation{}, &model.Resource{}); err != nil {
		t.Fatal(err)
	}
	for _, query := range []string{
		"CREATE TABLE fg_accounts(user_id TEXT PRIMARY KEY,platform_role TEXT)",
		"INSERT INTO fg_accounts VALUES('admin','superadmin'),('peer-admin','superadmin'),('alice','member'),('bob','member')",
		"CREATE TABLE fg_story_projects(native_project_id TEXT PRIMARY KEY)",
		"INSERT INTO fg_story_projects VALUES('story')",
		"CREATE TABLE fg_resource_grants(project_id TEXT,resource_id TEXT,PRIMARY KEY(project_id,resource_id))",
		"CREATE TABLE fg_asset_grants(project_id TEXT,asset_id TEXT,PRIMARY KEY(project_id,asset_id))",
		"CREATE TABLE fg_company_assets(resource_id TEXT)",
	} {
		if err = db.Exec(query).Error; err != nil {
			t.Fatal(err)
		}
	}
	for _, project := range []model.Project{
		{ID: "private", UserID: "alice", Name: "private"},
		{ID: "admin-private", UserID: "peer-admin", Name: "admin-private"},
		{ID: "story", UserID: "peer-admin", Name: "story"},
	} {
		if err = db.Create(&project).Error; err != nil {
			t.Fatal(err)
		}
		asset := model.Asset{ID: project.ID + "-character", UserID: project.UserID, Kind: "entity", Category: model.AssetCategoryCharacter}
		if err = db.Create(&asset).Error; err != nil {
			t.Fatal(err)
		}
		if err = db.Create(&model.ProjectAssetLink{ID: project.ID + "-link", ProjectID: project.ID, AssetID: asset.ID}).Error; err != nil {
			t.Fatal(err)
		}
	}
	repo := New(db)
	for _, tc := range []struct {
		actor, project, asset string
		allowed               bool
	}{
		{"alice", "private", "private-character", true},
		{"admin", "private", "private-character", true},
		{"bob", "private", "private-character", false},
		{"admin", "admin-private", "admin-private-character", false},
		{"bob", "story", "story-character", true},
		{"admin", "story", "story-character", true},
		{"admin", "story", "admin-private-character", false},
		{"alice", "private", "story-character", false},
	} {
		t.Run(tc.actor+"/"+tc.project+"/"+tc.asset, func(t *testing.T) {
			asset, err := repo.ProjectCharacterAsset(tc.actor, tc.project, tc.asset)
			if tc.allowed {
				if err != nil || asset == nil || asset.ID != tc.asset {
					t.Fatalf("authorized project character unavailable: %v", err)
				}
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				t.Fatalf("private or unlinked character exposed: %v", err)
			}
		})
	}
	t.Run("shared version publishes its bound image but private version does not", func(t *testing.T) {
		for _, project := range []string{"story", "private"} {
			resource := model.Resource{ID: project + "-image", UserID: "admin", Kind: "image", Status: model.ResourceStatusReady}
			if err := db.Create(&resource).Error; err != nil {
				t.Fatal(err)
			}
			asset, err := repo.ProjectCharacterAsset("admin", project, project+"-character")
			if err != nil {
				t.Fatal(err)
			}
			version := model.AssetVersion{ID: project + "-v1", AssetID: asset.ID, Version: 1}
			asset.PrimaryVersionID = version.ID
			if err := repo.SaveCharacterVersion(project, asset, &version, []model.AssetRepresentation{{ID: project + "-primary", TaskID: project + "-binding", AssetVersionID: version.ID, ResourceID: resource.ID, Role: "primary"}}, nil); err != nil {
				t.Fatal(err)
			}
			_, err = repo.ResourceForUser("bob", resource.ID)
			if project == "story" && err != nil {
				t.Fatalf("shared character image unavailable to another member: %v", err)
			}
			if project == "private" && !errors.Is(err, gorm.ErrRecordNotFound) {
				t.Fatalf("private character image leaked: %v", err)
			}
		}
	})
}
