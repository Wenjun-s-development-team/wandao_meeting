// Package websocket 处理
package websocket

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"io.wandao.meeting/internal/conf"
	"io.wandao.meeting/internal/helper"
	"io.wandao.meeting/internal/models"
	log "unknwon.dev/clog/v2"
)

const (
	defaultRoomId = 101 // 默认平台ID
)

var (
	clientManager = NewClientManager()                     // 管理者
	roomIds       = []uint64{defaultRoomId, 102, 103, 104} // 房间IDs
	serverIp      string
	serverPort    string
)

// GetRoomIds 所有房间IDs
func GetRoomIds() []uint64 {
	return roomIds
}

// GetServer 获取服务器
func GetServer() (server *models.Server) {
	server = models.NewServer(serverIp, serverPort)
	return
}

// IsLocal 判断是否为本机
func IsLocal(server *models.Server) (isLocal bool) {
	if server.Ip == serverIp && server.Port == serverPort {
		isLocal = true
	}
	return
}

// InRoomIds in room
func InRoomIds(roomId uint64) (inRoomId bool) {
	for _, value := range roomIds {
		if value == roomId {
			inRoomId = true
			return
		}
	}
	return
}

// GetDefaultRoomId 获取默认 roomId
func GetDefaultRoomId() (roomId uint64) {
	roomId = defaultRoomId
	return
}

func upgrader(writer http.ResponseWriter, request *http.Request) {
	// 升级协议
	conn, err := (&websocket.Upgrader{CheckOrigin: func(r *http.Request) bool {
		fmt.Println("升级协议", "ua:", r.Header["User-Agent"], "referer:", r.Header["Referer"])
		return true
	}}).Upgrade(writer, request, nil)

	if err != nil {
		http.NotFound(writer, request)
		return
	}

	fmt.Println("webSocket 建立连接:", conn.RemoteAddr().String())

	currentTime := uint64(time.Now().Unix())
	client := NewClient(conn.RemoteAddr().String(), conn, currentTime)
	go client.read()
	go client.write()

	// 用户连接事件
	clientManager.Register <- client
}

// StartWebRtc 启动程序
func StartWebRtc(path string) {
	serverIp = helper.GetServerIp()
	http.HandleFunc(path, upgrader)

	// 添加处理程序
	go clientManager.start()
	log.Trace("WebRTC Listen on: %s:%s", serverIp, conf.Server.SocketPort)
	_ = http.ListenAndServe(":"+conf.Server.SocketPort, nil)
}
