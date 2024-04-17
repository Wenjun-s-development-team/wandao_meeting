package router

import (
	"github.com/gin-gonic/gin"
	"wdmeeting/middlewares"
	"wdmeeting/service"
)

func Router() *gin.Engine {
	r := gin.Default()

	r.Use(middlewares.Cors())
	r.Use(middlewares.ResponseHandler())

	// 将 WebRTCSocket 服务器集成到Gin路由器中
	r.GET("/webrtc/p2p/:roomId/:userId", service.WebRTCServer)
	r.POST("/webrtc/p2p/:roomId/:userId", service.WebRTCServer)

	// 用户登录
	r.POST("/user/login", service.UserLogin)

	user := r.Group("/user", middlewares.Auth())
	// 用户信息
	user.GET("/info", service.UserInfo)

	meeting := r.Group("/auth", middlewares.Auth())
	// 会议列表
	meeting.GET("/list", service.MeetingList)
	// 创建会议
	meeting.POST("/create", service.MeetingCreate)
	// 编辑会议
	meeting.PUT("/update", service.MeetingUpdate)
	// 删除会议
	meeting.DELETE("/remove", service.MeetingRemove)

	return r
}
