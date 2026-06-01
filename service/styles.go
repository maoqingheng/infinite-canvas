package service

import (
	"github.com/basketikun/infinite-canvas/model"
	"github.com/basketikun/infinite-canvas/repository"
)

func ListStyles(q model.Query) (model.StyleList, error) {
	items, total, err := repository.ListStyles(q)
	if err != nil {
		return model.StyleList{}, err
	}
	return model.StyleList{Items: items, Total: int(total)}, nil
}

func ListStyleDetails(categoryID int, q model.Query) (model.StyleDetailList, error) {
	items, total, err := repository.ListStyleDetails(categoryID, q)
	if err != nil {
		return model.StyleDetailList{}, err
	}
	return model.StyleDetailList{Items: items, Total: int(total)}, nil
}
