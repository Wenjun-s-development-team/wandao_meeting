// Package task 定时任务
package task

import (
	"fmt"
	"runtime/debug"
	"time"

	"io.wandao.meeting/internal/server/websocket"

	log "unknwon.dev/clog/v2"
)

// Init 初始化
func Init() {
	Timer(3*time.Second, 30*time.Second, cleanConnection, "", nil, nil)
}

// cleanConnection 清理超时连接
func cleanConnection(param interface{}) (result bool) {
	result = true
	defer func() {
		if r := recover(); r != nil {
			fmt.Println("ClearTimeoutConnections stop", r, string(debug.Stack()))
		}
	}()
	log.Trace("[Task]定时任务，清理超时连接 %v", param)
	websocket.ClearTimeoutConnections()
	return
}
