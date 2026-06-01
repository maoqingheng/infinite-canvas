package model

type Style struct {
	ID          int    `json:"id" gorm:"primaryKey"`
	Name        string `json:"name"`
	CoverURL    string `json:"coverUrl"`
	ActiveCount int    `json:"activeStylesCount" gorm:"column:active_styles_count"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

type StyleDetail struct {
	ID         int    `json:"id" gorm:"primaryKey"`
	CategoryID int    `json:"categoryId" gorm:"index"`
	Name       string `json:"name"`
	Logo       string `json:"logo"`
	FePrompt   string `json:"fePrompt" gorm:"column:fe_prompt;type:text"`
	IsHot      int    `json:"isHot" gorm:"column:is_hot"`
	Sort       int    `json:"sort"`
	CreatedAt  string `json:"createdAt"`
	UpdatedAt  string `json:"updatedAt"`
}

type StyleList struct {
	Items []Style `json:"items"`
	Total int     `json:"total"`
}

type StyleDetailList struct {
	Items []StyleDetail `json:"items"`
	Total int           `json:"total"`
}
