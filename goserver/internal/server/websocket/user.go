// Package websocket 处理
package websocket

import (
	"errors"
	"fmt"

	"io.wandao.meeting/internal/libs/cache"

	"github.com/redis/go-redis/v9"
)

// UserList 查询所有用户
func UserList(roomId uint64) (userList []uint64) {
	userList = make([]uint64, 0)
	list := GetUserList(roomId)
	userList = append(userList, list...)
	return
}

// CheckUserOnline 查询用户是否在线
func CheckUserOnline(roomId uint64, userId uint64) (online bool) {
	// 全平台查询
	if roomId == 0 {
		for _, roomId := range GetRoomIds() {
			online, _ = checkUserOnline(roomId, userId)
			if online {
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
