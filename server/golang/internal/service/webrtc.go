package service

import (
	"encoding/json"
	"net/http"
	"sync"

	log "unknwon.dev/clog/v2"

	"github.com/flamego/flamego"
	"github.com/gorilla/websocket"
)

// SignalMessage 信令消息结构
type SignalMessage struct {
	Type string                 `json:"type"`
	Data map[string]interface{} `json:"data"`
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
	// Rooms 全局变量，使用 sync.Map 存储房间和用户连接
	// key: 房间ID, value: Room (map[string]socket)
	Rooms = sync.Map{}
)

func WebRTCServer(c flamego.Context) {
	conn, err := upgrader.Upgrade(c.ResponseWriter(), c.Request().Request, nil)
	if err != nil {
		log.Error("Error upgrading to websocket: %s", err.Error())
		return
	}

	defer conn.Close()

	in := c.Params()

	// 监听信令消息
	for {
		signal, _ := readMessage(conn)
		// 根据信令类型 处理消息
		switch signal.Type {
		case "ping":
			_ = writeMessage(conn, SignalMessage{Type: "pong"})
		case "register":
			// 将 WebSocket连接 添加到房间中的用户
			joinToRoom(in["roomId"], in["userId"], conn)
		case "offer":
			// 处理 offer 信令，可能需要转发给其他客户端
			handleOffer(in["userId"], signal.Data["sessionDescription"].(string))
		case "answer":
			// 处理 answer 信令
			handleAnswer(in["userId"], signal.Data["sessionDescription"].(string))
		case "iceCandidate":
			// 处理 ICE候选者 信令
			handleIceCandidate(in["userId"], signal.Data["ICECandidate"].(string))
		default:
			log.Error("Unknown signal type: %s", signal.Type)
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
