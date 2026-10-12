package app

import (
	"encoding/json"
	"strings"
	"yingce/backend/internal/model"
)

// Never mark a truncated chapter storyboard successful or import a partial batch.
func (s *Service) validateStoryboardTaskResult(task model.Task, result map[string]interface{}) error {
	if task.Type != "canvas_text" {
		return nil
	}
	decrypted, err := s.decryptTaskInputJSON(task.InputJSON)
	if err != nil {
		return err
	}
	var input struct {
		Metadata struct {
			Source string `json:"source"`
		} `json:"metadata"`
	}
	if err = json.Unmarshal([]byte(decrypted), &input); err != nil {
		return err
	}
	if input.Metadata.Source != "short-drama-chapter-storyboard" {
		return nil
	}
	text, _ := result["text"].(string)
	if !completeStoryboardJSON(text) {
		return BadAuthRequest("分镜结果不完整，可能已达到模型输出上限；未写入半批镜头。请重新生成分镜")
	}
	return nil
}

func completeStoryboardJSON(text string) bool {
	text = strings.TrimSpace(text)
	if first, last := strings.Index(text, "{"), strings.LastIndex(text, "}"); first >= 0 && last > first {
		text = text[first : last+1]
	}
	var output struct {
		Rows []json.RawMessage `json:"rows"`
	}
	return json.Unmarshal([]byte(text), &output) == nil && len(output.Rows) > 0
}
