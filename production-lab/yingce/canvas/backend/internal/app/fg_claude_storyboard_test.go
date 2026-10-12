package app

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
)

func TestFGClaudeUsesBoundedTeamOutputCeiling(t *testing.T) {
	t.Setenv("CANVAS_FG_TEAM_WORKSPACE", "true")
	t.Setenv("CANVAS_ALLOWED_PRIVATE_UPSTREAM_HOSTS", "127.0.0.1")
	for _, limit := range []int{0, 8192} {
		t.Run(strconv.Itoa(limit), func(t *testing.T) {
			wanted := limit
			if wanted == 0 {
				wanted = 16384
			}
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				var body map[string]any
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					t.Error(err)
				}
				if body["max_tokens"] != float64(wanted) {
					t.Errorf("Claude max_tokens=%v, want %d", body["max_tokens"], wanted)
				}
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte(`{"content":[{"type":"text","text":"complete"}],"stop_reason":"end_turn"}`))
			}))
			defer server.Close()
			_, err := runClaudeTextTask(context.Background(), canvasGenerationInput{Mode: "text", Prompt: "storyboard", MaxOutputTokens: limit, Config: providerConfig{BaseURL: server.URL, APIKey: "test", Model: "test"}})
			if err != nil {
				t.Fatal(err)
			}
		})
	}
}
