// Package models 数据模型
package models

// SendRequest 通用发送信息结构体
type SendRequest struct {
	Seq  string      `json:"seq"`            // 消息的唯一ID
	Cmd  string      `json:"cmd"`            // 请求命令字
	Data interface{} `json:"data,omitempty"` // 数据 json
}

// LoginRequest 登录请求数据
type LoginRequest struct {
	Token  string `json:"token"`  // 验证用户是否登录
	RoomId uint64 `json:"roomId"` // 房间ID
	UserId uint64 `json:"userId"` // 用户ID
	Peers         // 直接嵌入的房间信息
}

// Peers 房间信息
type Peers struct {
	RoomId           uint64 `json:"roomId"`           // 房间ID
	UserId           uint64 `json:"userId"`           // 用户ID
	UserName         string `json:"userName"`         // 用户名
	UserLock         bool   `json:"userLock"`         // 用户锁
	RoomName         string `json:"roomName"`         // 房间名称
	RoomPasswd       string `json:"roomPasswd"`       // 房间密码
	RoomLock         bool   `json:"roomLock"`         // 房间锁
	PeerVideo        bool   `json:"useVideo"`         // 是否开启视频
	PeerAudio        bool   `json:"useAudio"`         // 是否开启音频
	PeerScreen       bool   `json:"useScreen"`        // 是否开启屏幕分享
	VideoStatus      bool   `json:"videoStatus"`      // 视频状态
	AudioStatus      bool   `json:"audioStatus"`      // 音频状态
	PeerHandStatus   bool   `json:"peerHandStatus"`   // 手形
	PeerRecordStatus bool   `json:"peerRecordStatus"` // 录音状态
	PeerVideoPrivacy bool   `json:"peerVideoPrivacy"` // 视频
}

// HeartBeat 心跳请求数据
type HeartBeat struct {
	UserId uint64 `json:"userId"`
}
