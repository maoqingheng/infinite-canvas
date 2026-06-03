package service

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/basketikun/infinite-canvas/model"
	"github.com/basketikun/infinite-canvas/repository"
)

const styleAPIURL = "https://camera.animelook.top/api/normal/styles"

var excludedStyleNames = []string{"自定义"}

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
	categories = filterStyleCategories(categories)
	now := time.Now().Format(time.RFC3339)

	styleItems := make([]model.Style, 0, len(categories))
	for _, c := range categories {
		activeStyles := c.ActiveStyles
		coverURL := randomStyleCover(activeStyles)
		styleItems = append(styleItems, model.Style{
			ID:          c.ID,
			Name:        c.Name,
			CoverURL:    coverURL,
			ActiveCount: len(activeStyles),
			CreatedAt:   now,
			UpdatedAt:   now,
		})
	}
	if err := repository.ReplaceStyles(styleItems); err != nil {
		return err
	}

	detailItems := make([]model.StyleDetail, 0)
	for _, c := range categories {
		activeStyles := c.ActiveStyles
		for _, d := range activeStyles {
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
	}
	if err := repository.ReplaceAllStyleDetails(detailItems); err != nil {
		log.Printf("replace style details failed err=%v", err)
	}
	return nil
}

func filterStyleDetails(details []styleAPIDetail) []styleAPIDetail {
	items := make([]styleAPIDetail, 0, len(details))
	for _, detail := range details {
		if isExcludedStyleName(detail.Name) {
			continue
		}
		items = append(items, detail)
	}
	return items
}

func filterStyleCategories(categories []styleAPICategory) []styleAPICategory {
	items := make([]styleAPICategory, 0, len(categories))
	for _, category := range categories {
		if category.ID <= 0 || isExcludedStyleName(category.Name) {
			continue
		}
		category.ActiveStyles = filterStyleDetails(category.ActiveStyles)
		if len(category.ActiveStyles) == 0 {
			continue
		}
		category.ActiveCount = len(category.ActiveStyles)
		items = append(items, category)
	}
	return items
}

func isExcludedStyleName(name string) bool {
	styleName := strings.TrimSpace(name)
	if styleName == "" {
		return false
	}
	for _, excludedName := range excludedStyleNames {
		if styleName == strings.TrimSpace(excludedName) {
			return true
		}
	}
	return false
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
	if len(details) == 0 {
		return ""
	}
	for _, i := range rand.Perm(len(details)) {
		if details[i].Logo != "" {
			return details[i].Logo
		}
	}
	return ""
}
