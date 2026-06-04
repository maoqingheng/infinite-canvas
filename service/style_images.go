package service

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/basketikun/infinite-canvas/config"
)

const styleImageMaxBytes = 20 << 20

func cacheStyleImage(client *http.Client, imageURL string, styleID int) (string, error) {
	imageURL = strings.TrimSpace(imageURL)
	if imageURL == "" || styleID <= 0 {
		return "", nil
	}
	if cached := findCachedStyleImage(styleID); cached != "" {
		return styleImageURL(cached), nil
	}
	parsed, err := url.Parse(imageURL)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return "", fmt.Errorf("风格图片地址无效")
	}
	resp, err := client.Get(imageURL)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("风格图片下载失败")
	}
	mimeType, ext, ok := normalizeStyleImageType(resp.Header.Get("Content-Type"), filepath.Ext(parsed.Path))
	if !ok {
		return "", fmt.Errorf("风格图片格式不支持")
	}
	if err := os.MkdirAll(styleImageDir(), 0o755); err != nil {
		return "", err
	}
	id := fmt.Sprintf("style-%d%s", styleID, ext)
	targetPath := filepath.Join(styleImageDir(), id)
	tmpPath := targetPath + ".tmp"
	target, err := os.OpenFile(tmpPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o644)
	if err != nil {
		return "", err
	}
	bytes, copyErr := io.Copy(target, io.LimitReader(resp.Body, styleImageMaxBytes+1))
	closeErr := target.Close()
	if copyErr != nil || closeErr != nil {
		_ = os.Remove(tmpPath)
		return "", fmt.Errorf("风格图片保存失败")
	}
	if bytes <= 0 || bytes > styleImageMaxBytes {
		_ = os.Remove(tmpPath)
		return "", fmt.Errorf("风格图片大小不合法")
	}
	if err := os.Rename(tmpPath, targetPath); err != nil {
		_ = os.Remove(tmpPath)
		return "", err
	}
	_ = mimeType
	return styleImageURL(id), nil
}

func StyleImagePath(id string) (string, bool) {
	if id == "" || id != filepath.Base(id) || strings.Contains(id, "..") {
		return "", false
	}
	if mimeTypeByStyleImageExt(filepath.Ext(id)) == "" {
		return "", false
	}
	return filepath.Join(styleImageDir(), id), true
}

func StyleImageMimeType(id string) string {
	return mimeTypeByStyleImageExt(filepath.Ext(id))
}

func styleImageURL(id string) string {
	path := "/api/media/styles/" + id
	publicBaseURL := strings.TrimRight(strings.TrimSpace(config.Cfg.PublicBaseURL), "/")
	if publicBaseURL == "" {
		return path
	}
	return publicBaseURL + path
}

func findCachedStyleImage(styleID int) string {
	matches, err := filepath.Glob(filepath.Join(styleImageDir(), fmt.Sprintf("style-%d.*", styleID)))
	if err != nil || len(matches) == 0 {
		return ""
	}
	return filepath.Base(matches[0])
}

func styleImageDir() string {
	return filepath.Join(localDataDir(), "style-images")
}

func localDataDir() string {
	driver := strings.ToLower(strings.TrimSpace(config.Cfg.StorageDriver))
	dsn := strings.TrimSpace(config.Cfg.DatabaseDSN)
	if (driver == "" || driver == "sqlite") && dsn != "" && dsn != ":memory:" && !strings.HasPrefix(dsn, "file:") {
		pathPart := dsn
		if index := strings.Index(dsn, "?"); index >= 0 {
			pathPart = dsn[:index]
		}
		if filepath.IsAbs(pathPart) {
			return filepath.Dir(pathPart)
		}
	}
	if _, err := os.Stat("/app/data"); err == nil {
		return "/app/data"
	}
	return "data"
}

func normalizeStyleImageType(contentType string, ext string) (string, string, bool) {
	contentType = strings.ToLower(strings.TrimSpace(strings.Split(contentType, ";")[0]))
	ext = strings.ToLower(strings.TrimSpace(ext))
	if contentType == "" || contentType == "application/octet-stream" {
		contentType = mimeTypeByStyleImageExt(ext)
	}
	if fixedExt := styleImageExtByMimeType(contentType); fixedExt != "" {
		return contentType, fixedExt, true
	}
	if mimeType := mimeTypeByStyleImageExt(ext); mimeType != "" {
		return mimeType, ext, true
	}
	return "", "", false
}

func styleImageExtByMimeType(mimeType string) string {
	switch strings.ToLower(mimeType) {
	case "image/jpeg", "image/jpg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "image/bmp":
		return ".bmp"
	case "image/gif":
		return ".gif"
	default:
		return ""
	}
}

func mimeTypeByStyleImageExt(ext string) string {
	switch strings.ToLower(ext) {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".webp":
		return "image/webp"
	case ".bmp":
		return "image/bmp"
	case ".gif":
		return "image/gif"
	default:
		return ""
	}
}
