// Package websocket 处理
package websocket

import (
	"errors"
	"fmt"
	"time"

	models "io.wandao.meeting/internal/server/models"

	"io.wandao.meeting/internal/libs/cache"

	"github.com/redis/go-redis/v9"
)

// UserList 查询所有用户
func UserList(roomId uint64) (userList []uint64) {
	userList = make([]uint64, 0)
	currentTime := uint64(time.Now().Unix())
	servers, err := cache.GetServerAll(currentTime)
	if err != nil {
		fmt.Println("给全体用户发消息", err)
		return
	}
	for _, _ = range servers {
		var (
			list []uint64
		)
		list = GetUserList(roomId)
		userList = append(userList, list...)
	}
	return
}

// CheckUserOnline 查询用户是否在线
func CheckUserOnline(roomId uint64, userId uint64) (online bool) {
	// 全平台查询
	if roomId == 0 {
		for _, roomId := range GetRoomIds() {
			online, _ = checkUserOnline(roomId, userId)
			if online == true {
				break
			}
		}
	} else {
		online, _ = checkUserOnline(roomId, userId)
	}
	return
}

// checkUserOnline 查询用户 是否在线
func checkUserOnline(roomId uint64, userId uint64) (online bool, err error) {
	key := GetUserKey(roomId, userId)
	userOnline, err := cache.GetUserOnlineInfo(key)
	if err != nil {
		if errors.Is(err, redis.Nil) {
			fmt.Println("GetUserOnlineInfo", roomId, userId, err)
			return false, nil
		}
		fmt.Println("GetUserOnlineInfo", roomId, userId, err)
		return
	}
	online = userOnline.IsOnline()
	return
}

// SendUserMessage 给用户发送消息
func SendUserMessage(cmd string, roomId uint64, userId uint64, message string) (sendResults bool, err error) {
	data := models.GetTextMsgData(models.MessageCmdMessage, message, userId)
	client := GetUserClient(roomId, userId)
	if client != nil {
		// 在本机发送
		sendResults, err = SendUserMessageLocal(roomId, userId, data)
		if err != nil {
			fmt.Println("给用户发送消息", roomId, userId, err)
		}
		return
	}
	return
}

// SendUserMessageLocal 给本机用户发送消息
func SendUserMessageLocal(roomId uint64, userId uint64, data string) (sendResults bool, err error) {
	client := GetUserClient(roomId, userId)
	if client == nil {
		err = errors.New("用户不在线")
		return
	}

	// 发送消息
	client.SendMsg([]byte(data))
	sendResults = true
	return
}

// SendUserMessageAll 给全体用户发消息
func SendUserMessageAll(cmd string, message string, roomId uint64, userId uint64) (sendResults bool, err error) {
	sendResults = true
	currentTime := uint64(time.Now().Unix())
	servers, err := cache.GetServerAll(currentTime)
	if err != nil {
		fmt.Println("给全体用户发消息", err)
		return
	}
	for _, _ = range servers {
		data := models.GetTextMsgData(cmd, message, userId)
		AllSendMessages(roomId, userId, data)
	}
	return
}
