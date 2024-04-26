// Package router 路由
package router

import (
	"github.com/gin-gonic/gin"
	"io.wandao.meeting/internal/context"
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

	// 用户组
	userRouter := r.Group("/user").Use(context.AuthMiddleware)
	{
		userRouter.GET("/list", context.Handle(user.List))
		userRouter.GET("/online", context.Handle(user.Online))
	}

	return r
}
