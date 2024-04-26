// Package user 用户调用接口
package user

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"io.wandao.meeting/internal/context"
	"io.wandao.meeting/internal/controller/types"
	"io.wandao.meeting/internal/db"
	"io.wandao.meeting/internal/server/websocket"
	"io.wandao.meeting/internal/utils/jwtutil"
)

// Login 登录
func Login(c *context.APIContext) {
	var in types.UserLogin
	if err := c.ShouldBindJSON(&in); err != nil {
		c.ResultError("账号或密码参数无效")
		return
	}
	user, err := db.Users.Login(c.Request.Context(), in.Name, in.Passwd)
	if err != nil {
		c.ResultError(err.Error())
		return
	}

	token, err := jwtutil.GenerateToken(user.Id, user.Name)

	if err != nil {
		c.ResultError(err.Error())
		return
	}

	c.ResultSuccess(gin.H{
		"token": token,
		"user":  user,
	})
}

// List 查看全部在线用户
func List(c *context.APIContext) {
	var in types.UserQuery
	if err := c.ShouldBindUri(&in); err != nil {
		c.ResultError("无效的房间ID")
		return
	}
	fmt.Println("http_request 查看全部在线用户", in.RoomId)
	userList := websocket.UserList(in.RoomId)

	c.ResultSuccess(gin.H{
		"userList":  userList,
		"userCount": len(userList),
	})
}

// Online 查看用户是否在线
func Online(c *context.APIContext) {
	var in types.UserMessage
	if err := c.ShouldBindJSON(&in); err != nil {
		c.ResultError("账号或密码参数无效")
		return
	}

	fmt.Println("http_request 查看用户是否在线", in.UserId, in.RoomId)
	online := websocket.CheckUserOnline(in.RoomId, in.UserId)

	c.ResultSuccess(gin.H{
		"userId": in.UserId,
		"online": online,
	})
}
