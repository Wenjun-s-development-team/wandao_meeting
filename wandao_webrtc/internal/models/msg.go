// Package models 数据模型
package models

import "io.wandao.meeting/internal/common"

const (
	// MessageTypeText 文本类型消息
	MessageTypeText = "text"
	// MessageCmdMsg 文本类型消息
	MessageCmdMsg = "msg"
	// MessageCmdEnter 用户进入类型消息
	MessageCmdEnter = "enter"
	// MessageCmdExit 用户退出类型消息
	MessageCmdExit = "exit"
)

// Message 消息的定义
type Message struct {
	Target string `json:"target"` // 目标
	Type   string `json:"type"`   // 消息类型 text ｜ img
	Msg    string `json:"msg"`    // 消息内容
	From   uint64 `json:"from"`   // 发送者userId
}

// NewMsg 创建新的消息
func NewMsg(from uint64, Msg string) (message *Message) {
	message = &Message{
		Type: MessageTypeText,
		From: from,
		Msg:  Msg,
	}
	return
}

func getTextMsgData(cmd string, uuID uint64, msgID string, message string) string {
	textMsg := NewMsg(uuID, message)
	head := NewResponseHead(msgID, cmd, common.OK, "Ok", textMsg)

	return head.String()
}

// GetMsgData 文本消息
func GetMsgData(uuID uint64, msgID string, cmd string, message string) string {
	return getTextMsgData(cmd, uuID, msgID, message)
}

// GetTextMsgData 文本消息
func GetTextMsgData(uuID uint64, msgID string, message string) string {
	return getTextMsgData("msg", uuID, msgID, message)
}

// GetTextMsgDataEnter 用户进入消息
func GetTextMsgDataEnter(uuID uint64, msgID string, message string) string {
	return getTextMsgData("enter", uuID, msgID, message)
}

// GetTextMsgDataExit 用户退出消息
func GetTextMsgDataExit(uuID uint64, msgID string, message string) string {
	return getTextMsgData("exit", uuID, msgID, message)
}
