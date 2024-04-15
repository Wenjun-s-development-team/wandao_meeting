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

	// 将Socket.IO服务器集成到Gin路由器中
	r.GET("/p2p/*any", service.WebRTC)
	r.POST("/p2p/*any", service.WebRTC)

	// 用户登录
	r.POST("/user/login", service.UserLogin)

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
