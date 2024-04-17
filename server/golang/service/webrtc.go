package service

import (
	"encoding/json"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"log"
	"net/http"
	"sync"
)

// SignalMessage 信令消息结构
type SignalMessage struct {
	Type string                 `json:"type"`
	Data map[string]interface{} `json:"data"`
}

// ConnectionQuery
// ws://localhost:8686/webrtc/p2p/:roomId/:userId
type ConnectionQuery struct {
	RoomId string `json:"roomId" uri:"roomId"`
	UserId string `json:"userId" uri:"userId"`
}

// Room 一个用户映射一个 socket
type Room map[string]*websocket.Conn

// readMessage 从 WebSocket 连接中读取 JSON 消息
func readMessage(conn *websocket.Conn) (SignalMessage, error) {
	var message SignalMessage
	_, msgBytes, err := conn.ReadMessage()
	if err != nil {
		return SignalMessage{}, err
	}
	if err := json.Unmarshal(msgBytes, &message); err != nil {
		return SignalMessage{}, err
	}
	return message, nil
}

// writeMessage 将 JSON 消息写入 WebSocket 连接
func writeMessage(conn *websocket.Conn, message SignalMessage) error {
	msgBytes, err := json.Marshal(message)
	if err != nil {
		return err
	}
	return conn.WriteMessage(websocket.TextMessage, msgBytes)
}

var (
	upgrader = websocket.Upgrader{
		// 升级协议 允许跨域
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
	// Rooms 全局变量，使用sync.Map存储房间和用户连接
	// key: 房间ID, value: Room (map[string]WebSocketConn)
	Rooms = sync.Map{}
)

func WebRTCServer(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("Error upgrading to websocket:", err)
		return
	}

	defer func() {
		_ = conn.Close()
	}()

	in := new(ConnectionQuery)
	_ = c.ShouldBindUri(in)

	// 监听信令消息
	for {
		signal, _ := readMessage(conn)
		// 根据信令类型 处理消息
		switch signal.Type {
		case "ping":
			_ = writeMessage(conn, SignalMessage{Type: "pong"})
		case "register":
			// 将 WebSocket连接 添加到房间中的用户
			joinToRoom(in.RoomId, in.UserId, conn)
		case "offer":
			// 处理 offer 信令，可能需要转发给其他客户端
			handleOffer(in.UserId, signal.Data["sessionDescription"].(string))
		case "answer":
			// 处理 answer 信令
			handleAnswer(in.UserId, signal.Data["sessionDescription"].(string))
		case "iceCandidate":
			// 处理 ICE候选者 信令
			handleIceCandidate(in.UserId, signal.Data["ICECandidate"].(string))
		default:
			log.Printf("Unknown signal type: %s", signal.Type)
		}
	}

	// TODO 当连接关闭时，从连接映射中移除
}

// handleOffer 处理 offer 信令消息
func handleOffer(userId string, sessionDescription string) {
	// 遍历房间内所有连接，并将 offer 转发给它们
	Rooms.Range(func(key, value interface{}) bool {
		// roomID := key.(string)
		room := value.(Room)
		for _, conn := range room {
			_ = writeMessage(conn, SignalMessage{Type: "pong"})
		}
		return true
	})
}

// handleAnswer 处理answer信令消息
func handleAnswer(userId string, sessionDescription string) {

}

// handleIceCandidate 处理ICE候选者信令消息
func handleIceCandidate(userId string, candidate string) {
	// 遍历房间内其他所有连接，并将ICE候选者转发给它们
}

func joinToRoom(roomId string, userId string, conn *websocket.Conn) Room {
	var room Room
	// 尝试从sync.Map中加载房间
	if val, loaded := Rooms.Load(roomId); loaded {
		// 类型断言成功加载的值
		room = val.(Room)
	} else {
		// 如果房间不存在，则创建
		room = make(Room)
	}

	room[userId] = conn

	// 将 WebSocket连接 添加到房间中的用户
	Rooms.Store(roomId, room)
	return room
}
