package app

import "yingce/backend/internal/model"

func (s *Service) FGRecycledCanvases(userID string) ([]model.CanvasProject, error) {
	return s.repo.FGRecycledCanvases(userID)
}
func (s *Service) FGRestoreCanvas(userID, id string) error {
	s.storageMu.Lock()
	defer s.storageMu.Unlock()
	return s.repo.FGRestoreCanvas(userID, id)
}
