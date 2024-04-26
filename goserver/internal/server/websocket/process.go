// Package websocket 处理
package websocket

import (
	"encoding/json"
	"sync"

	"io.wandao.meeting/internal/server/models"
	log "unknwon.dev/clog/v2"

	"io.wandao.meeting/internal/common"
)

// DisposeFunc 处理函数
type DisposeFunc func(client *Client, seq string, message []byte) (code uint64, msg string, data interface{})

var (
	handlers        = make(map[string]DisposeFunc)
	handlersRWMutex sync.RWMutex
)

// Register 注册
func Register(key string, value DisposeFunc) {
	handlersRWMutex.Lock()
	defer handlersRWMutex.Unlock()
	handlers[key] = value
}

func getHandlers(key string) (value DisposeFunc, ok bool) {
	handlersRWMutex.RLock()
	defer handlersRWMutex.RUnlock()
	value, ok = handlers[key]
	return
}

// ProcessData 处理数据
func ProcessData(client *Client, message []byte) {
	log.Trace("[ProcessData]接收: %s | %s", client.Addr, string(message))
	defer func() {
		if r := recover(); r != nil {
			log.Error("[ProcessData]处理数据: %v", r)
		}
	}()
	request := &models.SendRequest{}
	if err := json.Unmarshal(message, request); err != nil {
		log.Error("[ProcessData]解析数据失败: %v", err)
		client.SendMsg([]byte("[ProcessData]解析数据失败"))
		return
	}
	requestData, err := json.Marshal(request.Data)
	if err != nil {
		log.Error("[ProcessData]处理数据失败: %v", err)
		client.SendMsg([]byte("处理数据失败"))
		return
	}
	seq := request.Seq
	cmd := request.Cmd
	var (
		code uint64
		msg  string
		// data interface{}
	)

	// 采用 map 注册的方式
	if value, ok := getHandlers(cmd); ok {
		code, msg, _ = value(client, seq, requestData)
	} else {
		code = common.RoutingNotExist
		log.Error("[ProcessData]处理数据 路由不存在: %s | %s", cmd, client.Addr)
	}
	log.Info("[ProcessData]应答: %s | roomId:%d | userId:%d | cmd:%s | code:%d | msg:%s", client.Addr, client.RoomId, client.UserId, cmd, code, msg)
}
