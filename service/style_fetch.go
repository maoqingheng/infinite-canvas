package service

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"math/rand"
	"net/http"
	"time"

	"github.com/basketikun/infinite-canvas/model"
	"github.com/basketikun/infinite-canvas/repository"
)

const styleAPIURL = "https://camera.animelook.top/api/normal/styles"

type styleResponseData struct {
	Data    []styleAPICategory `json:"data"`
	Code    int                `json:"code"`
	Message string             `json:"message"`
}

type styleAPICategory struct {
	ID           int              `json:"id"`
	Name         string           `json:"name"`
	ActiveCount  int              `json:"active_styles_count"`
	ActiveStyles []styleAPIDetail `json:"active_styles"`
}

type styleAPIDetail struct {
	ID         int    `json:"id"`
	CategoryID int    `json:"category_id"`
	Name       string `json:"name"`
	Logo       string `json:"logo"`
	FePrompt   string `json:"fe_prompt"`
	IsHot      int    `json:"is_hot"`
	Sort       int    `json:"sort"`
}

func SyncStyles() error {
	categories, err := fetchStyles()
	if err != nil {
		return err
	}
	now := time.Now().Format(time.RFC3339)

	styleItems := make([]model.Style, 0, len(categories))
	for _, c := range categories {
		if c.ID <= 0 {
			continue
		}
		coverURL := randomStyleCover(c.ActiveStyles)
		styleItems = append(styleItems, model.Style{
			ID:          c.ID,
			Name:        c.Name,
			CoverURL:    coverURL,
			ActiveCount: c.ActiveCount,
			CreatedAt:   now,
			UpdatedAt:   now,
		})
	}
	if err := repository.ReplaceStyles(styleItems); err != nil {
		return err
	}

	for _, c := range categories {
		if c.ID <= 0 || len(c.ActiveStyles) == 0 {
			continue
		}
		detailItems := make([]model.StyleDetail, 0, len(c.ActiveStyles))
		for _, d := range c.ActiveStyles {
			if d.ID <= 0 {
				continue
			}
			detailItems = append(detailItems, model.StyleDetail{
				ID:         d.ID,
				CategoryID: c.ID,
				Name:       d.Name,
				Logo:       d.Logo,
				FePrompt:   d.FePrompt,
				IsHot:      d.IsHot,
				Sort:       d.Sort,
				CreatedAt:  now,
				UpdatedAt:  now,
			})
		}
		if err := repository.ReplaceStyleDetails(c.ID, detailItems); err != nil {
			log.Printf("replace style details failed category_id=%d err=%v", c.ID, err)
		}
	}
	return nil
}

func fetchStyles() ([]styleAPICategory, error) {
	client := http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(styleAPIURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, errors.New("拉取风格数据失败")
	}
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	var styleResponseData styleResponseData
	if err := json.Unmarshal(data, &styleResponseData); err != nil {
		return nil, err
	}
	return styleResponseData.Data, nil
}

func randomStyleCover(details []styleAPIDetail) string {
	for _, i := range rand.Perm(len(details)) {
		if details[i].Logo != "" {
			return details[i].Logo
		}
	}
	return ""
}
