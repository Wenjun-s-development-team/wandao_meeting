// Package websocket 处理
package websocket

import (
	"encoding/json"
	"errors"
	"fmt"
	jsoniter "github.com/json-iterator/go"
	"io.wandao.meeting/internal/db"
	"io.wandao.meeting/internal/helper"
	"io.wandao.meeting/internal/server/models"
	"time"

	log "unknwon.dev/clog/v2"

	"github.com/redis/go-redis/v9"
	"io.wandao.meeting/internal/common"
	"io.wandao.meeting/internal/libs/cache"
)

// PingController ping
func PingController(client *Client, seq string, message []byte) (code uint64, msg string, data interface{}) {
	code = common.OK
	log.Info("[WebSocket] ping: %s, %s, %s", client.Addr, seq, message)
	data = "pong"
	return
}

// LoginController 用户登录
func LoginController(client *Client, seq string, message []byte) (code uint64, msg string, data interface{}) {
	code = common.OK
	currentTime := uint64(time.Now().Unix())
	request := &models.LoginRequest{}
	if err := json.Unmarshal(message, request); err != nil {
		code = common.ParameterIllegal
		log.Error("[WebSocket] LoginController 参数解析失败: %s, %v", seq, err)
		return
	}

	if request.UserId <= 0 {
		code = common.InvalidUserId
		log.Error("[WebSocket]LoginController: 无效的用户ID。%s, %s", seq, request.UserId)
		return
	}
	if request.RoomId <= 0 {
		code = common.InvalidRoomId
		log.Error("[WebSocket]LoginController: 无效的房间ID。%s, %s", seq, request.RoomId)
		return
	}
	if client.IsLogin() {
		log.Error("[WebSocket]LoginController: 用户已登录。(seq:%s, userId:%s, roomId: %s)", seq, request.UserId, request.RoomId)
		code = common.HasLoggedIn
		return
	}

	// TODO::进行用户权限认证，一般是客户端传入TOKEN，然后检验TOKEN是否合法，通过TOKEN解析出来用户ID
	log.Info("[WebSocket] login token:  %s, %s", seq, request.Token)
	user, err := db.Users.Get(request.UserId)
	if err != nil || user == nil {
		code = common.NotUser
		log.Error("[WebSocket]LoginController: user does not exist")
		return
	}
	room, err := db.Rooms.Get(request.RoomId)
	if err != nil || room == nil {
		code = common.NotRoom
		log.Error("[WebSocket]LoginController: room does not exist")
		return
	}

	peers := &models.Peers{
		RoomId:     request.RoomId,
		RoomName:   room.Name,
		RoomLock:   false,
		RoomPasswd: "",

		UserId:   request.UserId,
		UserName: user.Name,
		UserLock: false,

		UseVideo: request.UseVideo,
		UseAudio: request.UseAudio,

		AudioStatus:  request.AudioStatus,
		VideoStatus:  request.VideoStatus,
		ScreenStatus: request.ScreenStatus,

		HandStatus:    request.HandStatus,
		RecordStatus:  request.RecordStatus,
		PrivacyStatus: request.PrivacyStatus,
	}

	client.Login(request.RoomId, request.UserId, currentTime)

	// 存储数据
	userOnline := models.UserLogin(serverIp, serverPort, request.RoomId, request.UserId, client.Addr, currentTime)
	err = cache.SetUserOnlineInfo(client.GetKey(), userOnline)
	if err != nil {
		code = common.ServerError
		log.Error("[WebSocket]LoginController: 数据缓存失败(seq: %s, err: %v)", seq, err)
		return
	}

	// 用户登录
	login := &login{
		RoomId: request.RoomId,
		UserId: request.UserId,
		Client: client,
		Peers:  peers,
	}

	clientManager.Login <- login
	log.Info("[WebSocket]LoginController: 用户登录成功(seq: %s, IP: %s, userId: %s)", seq, client.Addr, request.UserId)
	return
}

// HeartbeatController 心跳接口
func HeartbeatController(client *Client, seq string, message []byte) (code uint64, msg string, data interface{}) {
	code = common.OK
	currentTime := uint64(time.Now().Unix())
	request := &models.HeartBeat{}
	if err := json.Unmarshal(message, request); err != nil {
		code = common.ParameterIllegal
		fmt.Println("心跳接口 解析数据失败", seq, err)
		return
	}
	fmt.Println("webSocket_request 心跳接口", client.RoomId, client.UserId)
	if !client.IsLogin() {
		fmt.Println("心跳接口 用户未登录", client.RoomId, client.UserId, seq)
		code = common.NotLoggedIn
		return
	}
	userOnline, err := cache.GetUserOnlineInfo(client.GetKey())
	if err != nil {
		if errors.Is(err, redis.Nil) {
			code = common.NotLoggedIn
			fmt.Println("心跳接口 用户未登录", seq, client.RoomId, client.UserId)
			return
		} else {
			code = common.ServerError
			fmt.Println("心跳接口 GetUserOnlineInfo", seq, client.RoomId, client.UserId, err)
			return
		}
	}
	client.Heartbeat(currentTime)
	userOnline.Heartbeat(currentTime)
	err = cache.SetUserOnlineInfo(client.GetKey(), userOnline)
	if err != nil {
		code = common.ServerError
		fmt.Println("心跳接口 SetUserOnlineInfo", seq, client.RoomId, client.UserId, err)
		return
	}
	return
}

// RelayIceCandidate 应答 onIceCandidate 事件
func RelayIceCandidate(client *Client, seq string, message []byte) (code uint64, msg string, data interface{}) {
	code = common.OK
	request := &models.IceCandidateRequest{}
	if err := json.Unmarshal(message, request); err != nil {
		code = common.ParameterIllegal
		log.Error("[WebSocket] OnIceCandidate 参数解析失败: %s, %v", seq, err)
		return
	}
	client.SendIceCandidate(request)
	return
}

func RelaySessionDescription(client *Client, seq string, message []byte) (code uint64, msg string, data interface{}) {
	code = common.OK
	request := &models.SessionDescriptionRequest{}
	if err := json.Unmarshal(message, request); err != nil {
		code = common.ParameterIllegal
		log.Error("[WebSocket] OnSessionDescription 参数解析失败: %s, %v", seq, err)
		return
	}
	client.SendSessionDescription(request)
	return
}

func RoomAction(client *Client, seq string, message []byte) (code uint64, msg string, data interface{}) {
	code = common.OK
	request := &models.RoomAction{}
	if err := json.Unmarshal(message, request); err != nil {
		code = common.ParameterIllegal
		log.Error("[WebSocket] RoomAction 参数解析失败: %s, %v", seq, err)
		return
	}
	u := *clientManager.Peers[request.RoomId][request.UserId]
	switch request.Action {
	case "lock":
		u.RoomLock = true
		u.RoomPasswd = request.Password
		relayRoomAction(client, request)
	case "unlock":
		u.RoomLock = false
		u.RoomPasswd = ""
		relayRoomAction(client, request)
	case "checkPassword":
		if u.RoomPasswd == request.Password {
			request.Password = "OK"
		} else {
			request.Password = "KO"
		}
		relayAction(client, request)
	}
	return
}

func PeerAction(client *Client, seq string, message []byte) (code uint64, msg string, data interface{}) {
	code = common.OK
	request := &models.RoomAction{}
	if err := json.Unmarshal(message, request); err != nil {
		code = common.ParameterIllegal
		log.Error("[WebSocket] RoomAction 参数解析失败: %s, %v", seq, err)
		return
	}

	switch request.Action {
	case "lock":
		u := *clientManager.Peers[request.RoomId][request.UserId]
		u.RoomLock = true
		u.RoomPasswd = request.Password
		relayRoomAction(client, request)
	case "unlock":
		u := *clientManager.Peers[request.RoomId][request.UserId]
		u.RoomLock = false
		u.RoomPasswd = ""
		relayRoomAction(client, request)
	}
	return
}

func PeerStatus(client *Client, seq string, message []byte) (code uint64, msg string, data interface{}) {
	code = common.OK
	request := &models.RoomStatus{}
	if err := json.Unmarshal(message, request); err != nil {
		code = common.ParameterIllegal
		log.Error("[WebSocket] RoomStatus 参数解析失败: %s, %v", seq, err)
		return
	}
	peers := clientManager.GetRoomPeers(request.RoomId)
	for _, peer := range peers {
		if peer.UserId == request.UserId {
			switch request.Action {
			case "video":
				peer.VideoStatus = request.Status
			case "audio":
				peer.AudioStatus = request.Status
			case "screen":
				peer.ScreenStatus = request.Status
			case "hand":
				peer.HandStatus = request.Status
			case "record":
				peer.RecordStatus = request.Status
			case "privacy":
				peer.PrivacyStatus = request.Status
			}
		}
	}

	d, err := jsoniter.Marshal(models.SendRequest{
		Seq:  helper.GetOrderIDTime(),
		Cmd:  "peerStatus",
		Data: request,
	})

	if err != nil {
		return
	}

	clientManager.sendRoomIdAll(d, request.RoomId, client)
	return
}

// relayRoomAction 向房间内全体成员转发 RoomAction 信息
func relayRoomAction(client *Client, request *models.RoomAction) {
	msg, err := jsoniter.Marshal(models.SendRequest{
		Seq:  helper.GetOrderIDTime(),
		Cmd:  request.Action,
		Data: request,
	})
	if err != nil {
		return
	}
	clientManager.sendRoomIdAll(msg, request.RoomId, client)
}

// relayAction 向指定成员 转发 RoomAction 信息
func relayAction(client *Client, request *models.RoomAction) {
	msg, err := jsoniter.Marshal(models.SendRequest{
		Seq:  helper.GetOrderIDTime(),
		Cmd:  request.Action,
		Data: request,
	})
	if err != nil {
		return
	}

	client.SendMsg(msg)
}
