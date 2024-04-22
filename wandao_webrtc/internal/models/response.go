// Package models 数据模型
package models

import "encoding/json"

// Head 响应数据头
type Head struct {
	Seq      string    `json:"seq"`      // 消息的ID
	Cmd      string    `json:"cmd"`      // 消息的 cmd 动作
	Response *Response `json:"response"` // 消息体
}

// Response 响应数据体
type Response struct {
	Code    uint64      `json:"code"`
	CodeMsg string      `json:"codeMsg"`
	Data    interface{} `json:"data"` // 数据 json
}

// Reply 应答数据体
type Reply struct {
	Seq  string      `json:"seq"`            // 消息的唯一ID
	Cmd  string      `json:"cmd"`            // 应答事件
	Data interface{} `json:"data,omitempty"` // 数据 json
}

// PushMsg 数据结构体
type PushMsg struct {
	Seq  string `json:"seq"`
	Uuid uint64 `json:"uuid"`
	Type string `json:"type"`
	Msg  string `json:"msg"`
}

// NewResponseHead 设置返回消息
func NewResponseHead(seq string, cmd string, code uint64, codeMsg string, data interface{}) *Head {
	response := NewResponse(code, codeMsg, data)

	return &Head{Seq: seq, Cmd: cmd, Response: response}
}

// String to string
func (h *Head) String() (headStr string) {
	headBytes, _ := json.Marshal(h)
	headStr = string(headBytes)

	return
}

// NewResponse 创建新的响应
func NewResponse(code uint64, codeMsg string, data interface{}) *Response {
	return &Response{Code: code, CodeMsg: codeMsg, Data: data}
}
