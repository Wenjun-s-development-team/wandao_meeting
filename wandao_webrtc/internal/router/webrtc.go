// Package router 路由
package router

import "io.wandao.meeting/internal/server/websocket"

// WebRtcInit Websocket 路由
func WebRtcInit() {
	websocket.Register("login", websocket.LoginController)
	websocket.Register("ping", websocket.PingController)
	websocket.Register("heartbeat", websocket.HeartbeatController)

	websocket.Register("relayICE", websocket.RelayIceCandidate)
	websocket.Register("relaySDP", websocket.RelaySessionDescription)

	websocket.Register("roomAction", websocket.RoomAction)
	websocket.Register("peerAction", websocket.PeerAction)
	websocket.Register("peerStatus", websocket.PeerStatus)
}
