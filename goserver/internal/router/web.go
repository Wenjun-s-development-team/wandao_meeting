// Package router 路由
package router

import (
	"github.com/gin-gonic/gin"
	"io.wandao.meeting/internal/context"
	"io.wandao.meeting/internal/controller/admin"
	"io.wandao.meeting/internal/controller/home"
	"io.wandao.meeting/internal/controller/systems"
	"io.wandao.meeting/internal/controller/user"
)

// WebInit http 接口路由
func WebInit() *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	r.Use(context.RecoveryMiddleware)
	r.Use(context.CorsMiddleware)

	r.POST("/login", context.Handle(user.Login))

	// home
	homeRouter := r.Group("/home")
	{
		homeRouter.GET("/index", context.Handle(home.Index))
	}

	// 系统
	systemRouter := r.Group("/system")
	{
		systemRouter.GET("/state", context.Handle(systems.Status))
	}

	adminRouter := r.Group("/admin")
	{
		adminRouter.GET("/save/user", context.Handle(admin.SaveUser))
		adminRouter.GET("/save/room", context.Handle(admin.SaveRoom))
	}

	// 用户组
	userRouter := r.Group("/user").Use(context.AuthMiddleware)
	{
		userRouter.GET("/list", context.Handle(user.List))
		userRouter.GET("/online", context.Handle(user.Online))
		userRouter.POST("/sendMessage", context.Handle(user.SendMessage))
		userRouter.POST("/sendMessageAll", context.Handle(user.SendMessageAll))
	}

	return r
}
