// Package router 路由
package router

import "io.wandao.meeting/internal/server/websocket"

// WebRtcInit Websocket 路由
func WebRtcInit() {
	websocket.Register("login", websocket.LoginController)
	websocket.Register("heartbeat", websocket.HeartbeatController)
	websocket.Register("ping", websocket.PingController)
}
