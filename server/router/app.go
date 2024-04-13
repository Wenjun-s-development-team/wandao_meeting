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

	// 用户登录
	r.POST("/user/login", service.UserLogin)

	// ws
	r.GET("/ws/p2p/:room_identity/:user_identity", service.WsP2PConnection)

	auth := r.Group("/auth", middlewares.Auth())

	// 会议列表
	auth.GET("/list", service.MeetingList)
	// 创建会议
	auth.POST("/create", service.MeetingCreate)
	// 编辑会议
	auth.PUT("/update", service.MeetingUpdate)
	// 删除会议
	auth.DELETE("/remove", service.MeetingRemove)

	return r
}
