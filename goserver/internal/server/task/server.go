// Package task 定时任务
package task

import (
	"runtime/debug"
	"time"

	"io.wandao.meeting/internal/libs/cache"
	"io.wandao.meeting/internal/server/websocket"

	log "unknwon.dev/clog/v2"
)

// ServerInit 服务初始化
func ServerInit() {
	Timer(2*time.Second, 60*time.Second, server, "", serverDefer, "")
}

// server 服务注册
func server(param interface{}) (result bool) {
	result = true
	defer func() {
		if r := recover(); r != nil {
			log.Trace("[Task]recover %v, %s", r, string(debug.Stack()))
		}
	}()
	s := websocket.GetServer()
	currentTime := uint64(time.Now().Unix())
	log.Trace("[Task]注册 %v, %v, %d", param, s, currentTime)
	_ = cache.SetServerInfo(s, currentTime)
	return
}

// serverDefer 服务下线
func serverDefer(param interface{}) (result bool) {
	defer func() {
		if r := recover(); r != nil {
			log.Trace("[Task]下线 %v, %s", r, string(debug.Stack()))
		}
	}()
	log.Trace("[Task]下线 %v", param)
	s := websocket.GetServer()
	_ = cache.DelServerInfo(s)
	return
}
