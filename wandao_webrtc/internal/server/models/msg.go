// Package models 数据模型
package models

import (
	"encoding/json"

	"io.wandao.meeting/internal/helper"
)

const (
	MessageCmdMessage    = "message"
	MessageCmdConnect    = "connect"
	MessageCmdDisconnect = "disconnect"
)

// Message 消息的定义
type Message struct {
	Seq  string      `json:"seq"`            // 消息的唯一ID
	Cmd  string      `json:"cmd"`            // 请求命令
	From uint64      `json:"from,omitempty"` // 发送者userId
	Data interface{} `json:"data,omitempty"` // 数据 json
}

// NewMsg 创建新的消息
func NewMsg(cmd string, data string, from uint64) (message *Message) {
	msgId := helper.GetOrderIDTime()
	message = &Message{
		Seq:  msgId,
		From: from,
		Cmd:  cmd,
		Data: data,
	}
	return
}

func (m *Message) String() (messageStr string) {
	bytes, _ := json.Marshal(m)
	messageStr = string(bytes)
	return
}

// GetTextMsgData 创建信息
func GetTextMsgData(cmd string, data string, formId uint64) string {
	msg := NewMsg(cmd, data, formId)
	return msg.String()
}
