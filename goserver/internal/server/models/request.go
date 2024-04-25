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
	RoomId     uint64 `json:"roomId"`     // 房间ID
	RoomName   string `json:"roomName"`   // 房间名称
	RoomLock   bool   `json:"roomLock"`   // 房间锁
	RoomPasswd string `json:"roomPasswd"` // 房间密码

	UserId   uint64 `json:"userId"`   // 用户ID
	UserName string `json:"userName"` // 用户名
	UserLock bool   `json:"userLock"` // 用户锁

	UseVideo bool `json:"useVideo"` // 是否有音频设备
	UseAudio bool `json:"useAudio"` // 是否有视频设备

	AudioStatus  bool `json:"audioStatus"`  // 音频播放状态
	VideoStatus  bool `json:"videoStatus"`  // 视频显示状态
	ScreenStatus bool `json:"screenStatus"` // 屏幕共享状态

	HandStatus    bool `json:"handStatus"`    // 是否举手
	RecordStatus  bool `json:"recordStatus"`  // 是否录音
	PrivacyStatus bool `json:"privacyStatus"` // 是否小视图
}

// HeartBeat 心跳请求数据
type HeartBeat struct {
	UserId uint64 `json:"userId"`
}
