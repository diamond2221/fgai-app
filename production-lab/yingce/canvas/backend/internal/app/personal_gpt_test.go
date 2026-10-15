package app

import (
	"encoding/json"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"strings"
	"testing"
	"yingce/backend/internal/model"
	"yingce/backend/internal/repository"
)

func TestPersonalGPTCredentialsAreEncryptedAndOwnerScoped(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err = db.AutoMigrate(&model.SystemSetting{}, &model.ModelChannel{}); err != nil {
		t.Fatal(err)
	}
	svc := New(repository.New(db), t.TempDir())
	value, err := svc.SavePersonalGPT("alice", "https://8.8.8.8/v1", "alice-test-key")
	if err != nil {
		t.Fatal(err)
	}
	if !value.Configured {
		t.Fatal("not saved")
	}
	var stored model.SystemSetting
	db.First(&stored, "key = ?", personalGPTSettingKey("alice"))
	if strings.Contains(stored.ValueJSON, "alice-test-key") {
		t.Fatal("plaintext key persisted")
	}
	encoded, _ := json.Marshal(value)
	if strings.Contains(string(encoded), "alice-test-key") {
		t.Fatal("key exposed")
	}
	bob, err := svc.PersonalGPT("bob")
	if err != nil || bob.Configured {
		t.Fatal("cross-owner credential leaked")
	}
	if _, err = svc.SavePersonalGPT("alice", "https://1.1.1.1/v1", ""); err == nil {
		t.Fatal("must reenter key on URL change")
	}
	if _, err = svc.SavePersonalGPT("alice", "http://127.0.0.1/v1", "x"); err == nil {
		t.Fatal("private/insecure URL accepted")
	}
	if err = db.Create(&model.ModelChannel{ID: "personal-gpt", Scope: model.ChannelScopeSystem, Name: personalGPTChannelName, Enabled: true}).Error; err != nil {
		t.Fatal(err)
	}
	cfg := providerConfig{Model: "gpt-6.1-sol", ChannelID: "personal-gpt"}
	resolved, err := svc.personalGPTProvider(cfg, "alice")
	if err != nil || resolved.APIKey != "alice-test-key" || resolved.BaseURL != "https://8.8.8.8/v1" {
		t.Fatal("owner resolution failed", err)
	}
	if _, err = svc.personalGPTProvider(cfg, "bob"); err == nil {
		t.Fatal("unconfigured account used another key")
	}
	if err = svc.DeletePersonalGPT("alice"); err != nil {
		t.Fatal(err)
	}
	if _, err = svc.personalGPTProvider(cfg, "alice"); err == nil {
		t.Fatal("deleted key remained usable")
	}
}
