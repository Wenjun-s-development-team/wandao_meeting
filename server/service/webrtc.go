package service

import (
	"encoding/json"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/pion/webrtc/v3"
	"log"
	"net/http"
)

// SignalMessage 信令消息结构
type SignalMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

var (
	upgrader = websocket.Upgrader{
		// 升级协议 允许跨域
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
	// 全局的WebSocket连接映射，用于跟踪哪些用户连接到了哪个房间
	connections = make(map[string]*websocket.Conn)
)

func WebRTCSocket(c *gin.Context) {
	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("Error upgrading to websocket:", err)
		return
	}

	defer func() {
		if err := ws.Close(); err != nil {
			log.Println(err.Error())
		}
	}()

	// TODO: 验证用户的身份，并分配到特定的房间
	roomID := "default"
	connections[roomID] = ws

	// 监听信令消息
	for {
		_, message, err := ws.ReadMessage()
		if err != nil {
			break
		}

		//if message == "ping" {
		//	ws.WriteMessage(websocket.TextMessage, signalJSON)
		//}

		var signal SignalMessage
		err = json.Unmarshal(message, &signal)
		if err != nil {
			log.Printf("Error unmarshaling signal: %v", err)
			continue
		}

		// 根据信令类型处理消息
		switch signal.Type {
		case "offer":
			// 处理offer信令，可能需要转发给其他客户端
			handleOffer(roomID, signal.Data.(webrtc.SessionDescription))
		case "answer":
			// 处理answer信令
			handleAnswer(roomID, signal.Data.(webrtc.SessionDescription))
		case "iceCandidate":
			// 处理ICE候选者信令
			handleIceCandidate(roomID, signal.Data.(*webrtc.ICECandidate))
		default:
			log.Printf("Unknown signal type: %s", signal.Type)
		}
	}

	// 当连接关闭时，从连接映射中移除
	delete(connections, roomID)
}

// handleOffer 处理offer信令消息
func handleOffer(roomID string, offer webrtc.SessionDescription) {
	// 遍历房间内其他所有连接，并将offer转发给它们
	for _, ws := range connections {
		if ws == nil {
			continue
		}
		// 序列化offer为JSON格式
		signal := SignalMessage{
			Type: "offer",
			Data: offer,
		}
		signalJSON, err := json.Marshal(signal)
		if err != nil {
			log.Printf("Error marshaling offer signal: %v", err)
			continue
		}
		// 发送JSON格式的offer给WebSocket客户端
		err = ws.WriteMessage(websocket.TextMessage, signalJSON)
		if err != nil {
			log.Printf("Error sending offer signal to client: %v", err)
			continue
		}
	}
}

// handleAnswer 处理answer信令消息
func handleAnswer(roomID string, answer webrtc.SessionDescription) {
	// 假设只有一个连接需要接收answer
	ws, ok := connections[roomID]
	if !ok || ws == nil {
		log.Printf("No connections or invalid connection for answer in room: %s", roomID)
		return
	}

	// 序列化answer为JSON格式
	signal := SignalMessage{
		Type: "answer",
		Data: answer,
	}
	signalJSON, err := json.Marshal(signal)
	if err != nil {
		log.Printf("Error marshaling answer signal: %v", err)
		return
	}

	// 发送JSON格式的answer给WebSocket客户端
	err = ws.WriteMessage(websocket.TextMessage, signalJSON)
	if err != nil {
		log.Printf("Error sending answer signal to client: %v", err)
	}
}

// handleIceCandidate 处理ICE候选者信令消息
func handleIceCandidate(roomID string, candidate *webrtc.ICECandidate) {
	// 遍历房间内其他所有连接，并将ICE候选者转发给它们
	for _, ws := range connections {
		if ws == nil {
			continue
		}
		// 序列化ICE候选者为JSON格式
		signal := SignalMessage{
			Type: "iceCandidate",
			Data: candidate,
		}
		signalJSON, err := json.Marshal(signal)
		if err != nil {
			log.Printf("Error marshaling ICE candidate signal: %v", err)
			continue
		}

		// 发送JSON格式的ICE候选者给WebSocket客户端
		err = ws.WriteMessage(websocket.TextMessage, signalJSON)
		if err != nil {
			log.Printf("Error sending ICE candidate signal to client: %v", err)
			continue
		}
	}
}
