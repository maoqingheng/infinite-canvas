package repository

import (
	"github.com/basketikun/infinite-canvas/model"
	"gorm.io/gorm"
)

func ListStyles(q model.Query) ([]model.Style, int64, error) {
	db, err := DB()
	if err != nil {
		return nil, 0, err
	}
	q.Normalize()
	tx := db.Model(&model.Style{})
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		tx = tx.Where("name LIKE ?", like)
	}
	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var items []model.Style
	if err := tx.Order("id asc").Offset(q.Offset()).Limit(q.PageSize).Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func ListStyleDetails(categoryID int, q model.Query) ([]model.StyleDetail, int64, error) {
	db, err := DB()
	if err != nil {
		return nil, 0, err
	}
	q.Normalize()
	tx := db.Model(&model.StyleDetail{})
	if categoryID > 0 {
		tx = tx.Where("category_id = ?", categoryID)
	}
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		tx = tx.Where("name LIKE ?", like)
	}
	if q.IsHot > 0 {
		tx = tx.Where("is_hot = ?", q.IsHot)
	}
	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var items []model.StyleDetail
	if err := tx.Order("sort desc, id asc").Offset(q.Offset()).Limit(q.PageSize).Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func ReplaceStyles(items []model.Style) error {
	db, err := DB()
	if err != nil {
		return err
	}
	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("1 = 1").Delete(&model.Style{}).Error; err != nil {
			return err
		}
		if len(items) == 0 {
			return nil
		}
		return tx.Create(&items).Error
	})
}

func ReplaceStyleDetails(categoryID int, items []model.StyleDetail) error {
	db, err := DB()
	if err != nil {
		return err
	}
	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("category_id = ?", categoryID).Delete(&model.StyleDetail{}).Error; err != nil {
			return err
		}
		if len(items) == 0 {
			return nil
		}
		for i := range items {
			items[i].CategoryID = categoryID
		}
		return tx.Create(&items).Error
	})
}

func ReplaceAllStyleDetails(items []model.StyleDetail) error {
	db, err := DB()
	if err != nil {
		return err
	}
	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("1 = 1").Delete(&model.StyleDetail{}).Error; err != nil {
			return err
		}
		if len(items) == 0 {
			return nil
		}
		return tx.Create(&items).Error
	})
}
