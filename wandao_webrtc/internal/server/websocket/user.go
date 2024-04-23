// Package websocket 处理
package websocket

import (
	"errors"
	"fmt"
	models "io.wandao.meeting/internal/server/models"
	"time"

	"io.wandao.meeting/internal/libs/cache"
	"io.wandao.meeting/internal/server/grpcclient"

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
	for _, server := range servers {
		var (
			list []uint64
		)
		if IsLocal(server) {
			list = GetUserList(roomId)
		} else {
			list, _ = grpcclient.GetUserList(server, roomId)
		}
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
func SendUserMessage(roomId uint64, userId uint64, msgID, message string) (sendResults bool, err error) {
	data := models.GetTextMsgData(userId, msgID, message)
	client := GetUserClient(roomId, userId)
	if client != nil {
		// 在本机发送
		sendResults, err = SendUserMessageLocal(roomId, userId, data)
		if err != nil {
			fmt.Println("给用户发送消息", roomId, userId, err)
		}
		return
	}
	key := GetUserKey(roomId, userId)
	info, err := cache.GetUserOnlineInfo(key)
	if err != nil {
		fmt.Println("给用户发送消息失败", key, err)
		return false, nil
	}
	if !info.IsOnline() {
		fmt.Println("用户不在线", key)
		return false, nil
	}
	server := models.NewServer(info.AppIp, info.AppPort)
	msg, err := grpcclient.SendMsg(server, msgID, roomId, userId, models.MessageCmdMsg, models.MessageCmdMsg, message)
	if err != nil {
		fmt.Println("给用户发送消息失败", key, err)
		return false, err
	}
	fmt.Println("给用户发送消息成功-rpc", msg)
	sendResults = true
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
func SendUserMessageAll(roomId uint64, userId uint64, msgID, cmd, message string) (sendResults bool, err error) {
	sendResults = true
	currentTime := uint64(time.Now().Unix())
	servers, err := cache.GetServerAll(currentTime)
	if err != nil {
		fmt.Println("给全体用户发消息", err)
		return
	}
	for _, server := range servers {
		if IsLocal(server) {
			data := models.GetMsgData(userId, msgID, cmd, message)
			AllSendMessages(roomId, userId, data)
		} else {
			_, _ = grpcclient.SendMsgAll(server, msgID, roomId, userId, cmd, message)
		}
	}
	return
}
