package handler

import (
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/basketikun/infinite-canvas/service"
)

func Styles(w http.ResponseWriter, r *http.Request) {
	result, err := service.ListStyles(parseQuery(r))
	if err != nil {
		FailError(w, err)
		return
	}
	OK(w, result)
}

func StyleDetails(w http.ResponseWriter, r *http.Request, id string) {
	categoryID, _ := strconv.Atoi(id)
	result, err := service.ListStyleDetails(categoryID, parseQuery(r))
	if err != nil {
		FailError(w, err)
		return
	}
	OK(w, result)
}

func AdminStyles(w http.ResponseWriter, r *http.Request) {
	result, err := service.ListStyles(parseQuery(r))
	if err != nil {
		FailError(w, err)
		return
	}
	OK(w, result)
}

func AdminSyncStyles(w http.ResponseWriter, r *http.Request) {
	log.Printf("sync styles start")
	if err := service.SyncStyles(); err != nil {
		log.Printf("sync styles failed err=%v", err)
		FailError(w, err)
		return
	}
	log.Printf("sync styles done")
	OK(w, true)
}

func StyleImageProxy(w http.ResponseWriter, r *http.Request) {
	imageURL := r.URL.Query().Get("url")
	if imageURL == "" {
		Fail(w, "缺少 url 参数")
		return
	}
	client := http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(imageURL)
	if err != nil {
		FailError(w, err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		Fail(w, "获取图片失败")
		return
	}
	contentType := resp.Header.Get("Content-Type")
	if contentType != "" {
		w.Header().Set("Content-Type", contentType)
	}
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	_, _ = io.Copy(w, resp.Body)
}
