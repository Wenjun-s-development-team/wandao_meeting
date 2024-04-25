package server

import (
	"io.wandao.meeting/internal/conf"
	"io.wandao.meeting/internal/db"
	"io.wandao.meeting/internal/libs/redislib"
	"io.wandao.meeting/internal/router"
	"io.wandao.meeting/internal/server/task"
	"io.wandao.meeting/internal/server/websocket"
	"net/http"
	log "unknwon.dev/clog/v2"
)

func Start() {
	err := conf.Init()
	if err != nil {
		log.Fatal("Failed to initialize application: %v", err)
	}
	conf.InitLogging(false)
	_, err = db.InitDatabaseEngine()
	if err != nil {
		log.Fatal("SetDatabaseEngine error: %v", err)
	}

	log.Info("%s %s", conf.App.BrandName, conf.App.Version)
	log.Trace("Work directory: %s", conf.WorkDir())
	log.Trace("Log path: %s", conf.Log.RootPath)
	log.Trace("Build time: %s", conf.BuildTime)
	log.Trace("Build commit: %s", conf.BuildCommit)

	redislib.Init()

	// 初始化路由
	r := router.WebInit()
	router.WebRtcInit()

	// 定时任务
	task.Init()
	// 服务注册
	task.ServerInit()
	go websocket.StartWebRtc("/webrtc")

	httpPort := conf.Server.HTTPPort
	_ = http.ListenAndServe(":"+httpPort, r)
}
