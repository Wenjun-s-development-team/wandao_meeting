package service

import (
	"fmt"
	"github.com/gin-gonic/gin"
	socketio "github.com/googollee/go-socket.io"
	"log"
)

func WebRTC(c *gin.Context) {
	server := socketio.NewServer(nil)

	server.ServeHTTP(c.Writer, c.Request)

	// 处理连接事件
	server.OnConnect("/", func(so socketio.Conn) error {
		fmt.Println("Client connected:", so.ID())
		// 将客户端加入房间
		so.Join("roomName")
		so.Emit("connect")
		return nil
	})

	// 处理断开连接事件
	server.OnDisconnect("/", func(so socketio.Conn, reason string) {
		fmt.Println("Client disconnected:", so.ID(), "Reason:", reason)
		// 客户端断开连接时将其从房间中移除
		so.Leave("roomName")
	})

	// 处理错误事件
	server.OnError("/", func(so socketio.Conn, err error) {
		log.Println("meet error:", err)
	})

	// 处理客户端发来的信令消息
	server.OnEvent("/", "peer-signal", func(so socketio.Conn, msg string) {
		fmt.Printf("Received peer signal from client %s: %s\n", so.ID(), msg)
		// 处理信令消息，比如广播给其他客户端或者保存到数据库中

		// 发送响应或广播给所有客户端
		server.BroadcastToRoom("roomName", "peer-signal-response", msg)
	})

	go func() {
		if err := server.Serve(); err != nil {
			log.Fatalf("socketio listen error: %s\n", err)
		}
	}()

	defer func() {
		err := server.Close()
		if err != nil {
			log.Fatalf("socketio close error: %s\n", err)
		}
	}()
}
