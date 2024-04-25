// Package user 用户调用接口
package user

import (
	"fmt"
	"io.wandao.meeting/internal/server/models"

	"github.com/gin-gonic/gin"
	"github.com/pkg/errors"
	"io.wandao.meeting/internal/context"
	"io.wandao.meeting/internal/controller/types"
	"io.wandao.meeting/internal/db"
	"io.wandao.meeting/internal/libs/cache"
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
	user, err := db.Users.Authenticate(c.Request.Context(), in.Name, in.Passwd)
	if err != nil {
		if errors.Is(err, db.ErrUserNotExist{}) {
			c.ResultError("账号不存在或已禁用")
		} else if errors.Is(err, db.ErrBadCredentials{}) {
			c.ResultError("账号或密码不匹配")
		}
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

// SendMessage 给用户发送消息
func SendMessage(c *context.APIContext) {
	// 获取参数
	var in types.UserMessage
	if err := c.ShouldBindJSON(&in); err != nil {
		c.ResultError("账号或密码参数无效")
		return
	}

	fmt.Println("http_request 给用户发送消息", in.RoomId, in.UserId, in.MsgId, in.Message)

	// TODO::进行用户权限认证，一般是客户端传入TOKEN，然后检验TOKEN是否合法，通过TOKEN解析出来用户ID
	if cache.SeqDuplicates(in.MsgId) {
		fmt.Println("给用户发送消息 重复提交:", in.MsgId)
		c.Set("data", gin.H{})
		return
	}
	sendResults, err := websocket.SendUserMessage(models.MessageCmdMessage, in.RoomId, in.UserId, in.Message)

	if err != nil {
		c.ResultError(err.Error())
	}
	c.ResultSuccess(gin.H{
		"sendResults": sendResults,
	})
}

// SendMessageAll 给全员发送消息
func SendMessageAll(c *context.APIContext) {
	// 获取参数
	var in types.UserMessage
	if err := c.ShouldBindJSON(&in); err != nil {
		c.ResultError("账号或密码参数无效")
		return
	}

	fmt.Println("http_request 给全体用户发送消息", in.RoomId, in.UserId, in.MsgId, in.Message)

	if cache.SeqDuplicates(in.MsgId) {
		fmt.Println("给用户发送消息 重复提交:", in.MsgId)
		c.Set("data", gin.H{})
		return
	}
	sendResults, err := websocket.SendUserMessageAll(models.MessageCmdMessage, in.Message, in.RoomId, in.UserId)

	if err != nil {
		c.ResultError(err.Error())
	}

	c.ResultSuccess(gin.H{
		"sendResults": sendResults,
	})
}
