package service

import (
	"log"
	"sync"

	"github.com/basketikun/infinite-canvas/model"
	"github.com/basketikun/infinite-canvas/repository"
	"github.com/robfig/cron/v3"
)

const defaultStyleSyncCron = "*/1 * * * *"

var (
	styleSyncCron *cron.Cron
	styleSyncOnce sync.Once
	styleSyncMu   sync.Mutex
)

func StartStyleSyncScheduler() {
	styleSyncOnce.Do(func() {
		styleSyncCron = cron.New()
		styleSyncCron.Start()
	})
	RefreshStyleSyncScheduler()
}

func RefreshStyleSyncScheduler() {
	styleSyncMu.Lock()
	defer styleSyncMu.Unlock()
	if styleSyncCron == nil {
		return
	}
	for _, entry := range styleSyncCron.Entries() {
		styleSyncCron.Remove(entry.ID)
	}
	settings, err := repository.GetSettings()
	if err != nil {
		log.Printf("load style sync setting failed err=%v", err)
		return
	}
	setting := normalizeStyleSyncSetting(settings.Private.StyleSync)
	if setting.Enabled == nil || !*setting.Enabled {
		return
	}
	if _, err := styleSyncCron.AddFunc(setting.Cron, func() {
		log.Printf("scheduled style sync start")
		if err := SyncStyles(); err != nil {
			log.Printf("scheduled style sync failed err=%v", err)
			return
		}
		log.Printf("scheduled style sync done")
	}); err != nil {
		log.Printf("add style sync cron failed cron=%s err=%v", setting.Cron, err)
	}
}

func normalizeStyleSyncSetting(setting model.StyleSyncSetting) model.StyleSyncSetting {
	if setting.Cron == "" {
		setting.Cron = defaultStyleSyncCron
	}
	if setting.Enabled == nil {
		enabled := true
		setting.Enabled = &enabled
	}
	return setting
}
