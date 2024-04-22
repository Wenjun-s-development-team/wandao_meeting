// Package models 数据模型
package models

// Request 通用请求数据格式
type Request struct {
	Seq  string      `json:"seq"`            // 消息的唯一ID
	Cmd  string      `json:"cmd"`            // 请求命令字
	Data interface{} `json:"data,omitempty"` // 数据 json
}

// Login 登录请求数据
type Login struct {
	Token  string `json:"token"` // 验证用户是否登录
	RoomId uint64 `json:"roomId"`
	UserId uint64 `json:"userId"`
}

// HeartBeat 心跳请求数据
type HeartBeat struct {
	UserId uint64 `json:"userId"`
}
