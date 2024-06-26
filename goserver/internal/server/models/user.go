// Package models 数据模型
package models

import (
	"fmt"
	"time"
)

const (
	heartbeatTimeout = 3 * 60 // 用户心跳超时时间
)

// UserOnline 用户在线状态
type UserOnline struct {
	AppIp         string `json:"appIp"`         // Ip
	AppPort       string `json:"appPort"`       // 端口
	RoomId        uint64 `json:"roomId"`        // roomId
	UserId        uint64 `json:"userId"`        // 用户ID
	UserName      string `json:"userName"`      // 用户名称
	UserLock      bool   `json:"userLock"`      // 是否锁定
	ClientIp      string `json:"clientIp"`      // 客户端Ip
	ClientPort    string `json:"clientPort"`    // 客户端端口
	LoginTime     uint64 `json:"loginTime"`     // 用户上次登录时间
	HeartbeatTime uint64 `json:"heartbeatTime"` // 用户上次心跳时间
	LogoutTime    uint64 `json:"logoutTime"`    // 用户退出登录的时间
	DeviceInfo    string `json:"deviceInfo"`    // 设备信息
	IsLogoff      bool   `json:"isLogoff"`      // 是否下线
}

// UserLogin 用户登录
func UserLogin(appIp, appPort string, roomId uint64, userId uint64, clientIp string, loginTime uint64) (userOnline *UserOnline) {
	userOnline = &UserOnline{
		AppIp:         appIp,
		AppPort:       appPort,
		RoomId:        roomId,
		UserId:        userId,
		ClientIp:      clientIp,
		LoginTime:     loginTime,
		HeartbeatTime: loginTime,
		IsLogoff:      false,
	}
	return
}

// Heartbeat 用户心跳
func (u *UserOnline) Heartbeat(currentTime uint64) {
	u.HeartbeatTime = currentTime
	u.IsLogoff = false
}

// LogOut 用户退出登录
func (u *UserOnline) LogOut() {
	currentTime := uint64(time.Now().Unix())
	u.LogoutTime = currentTime
	u.IsLogoff = true
}

// IsOnline 用户是否在线
func (u *UserOnline) IsOnline() (online bool) {
	if u.IsLogoff {
		return
	}
	currentTime := uint64(time.Now().Unix())
	if u.HeartbeatTime < (currentTime - heartbeatTimeout) {
		fmt.Println("用户是否在线 心跳超时", u.RoomId, u.UserId, u.HeartbeatTime)
		return
	}
	if u.IsLogoff {
		fmt.Println("用户是否在线 用户已经下线", u.RoomId, u.UserId)
		return
	}
	return true
}

// UserIsLocal 用户是否在本台机器上
func (u *UserOnline) UserIsLocal(localIp, localPort string) (result bool) {
	if u.AppIp == localIp && u.AppPort == localPort {
		result = true
		return
	}
	return
}
