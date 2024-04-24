// Package grpcclient grpc 客户端
package grpcclient

import (
	"context"
	"errors"
	"fmt"
	"io.wandao.meeting/internal/helper"
	"io.wandao.meeting/internal/server/models"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"io.wandao.meeting/internal/common"
	"io.wandao.meeting/internal/protobuf"
)

// SendMsgAll 给全体用户发送消息
// link::https://github.com/grpc/grpc-go/blob/master/examples/helloworld/greeter_client/main.go
func SendMsgAll(server *models.Server, roomId uint64, userId uint64, cmd string, message string) (sendMsgId string, err error) {
	// Set up a connection to the server.
	conn, err := grpc.Dial(server.String(), grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		fmt.Println("连接失败", server.String())

		return
	}
	defer func() { _ = conn.Close() }()
	c := protobuf.NewWebRTCClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	seq := helper.GetOrderIDTime()
	req := protobuf.SendMsgAllReq{
		Seq:    seq,
		RoomId: roomId,
		UserId: userId,
		Cmd:    cmd,
		Msg:    message,
	}
	rsp, err := c.SendMsgAll(ctx, &req)
	if err != nil {
		fmt.Println("给全体用户发送消息", err)

		return
	}
	if rsp.GetRetCode() != common.OK {
		fmt.Println("给全体用户发送消息", rsp.String())
		err = errors.New(fmt.Sprintf("发送消息失败 code:%d", rsp.GetRetCode()))

		return
	}
	sendMsgId = rsp.GetSendMsgId()
	fmt.Println("给全体用户发送消息 成功:", sendMsgId)
	return
}

// GetUserList 获取用户列表
// link::https://github.com/grpc/grpc-go/blob/master/examples/helloworld/greeter_client/main.go
func GetUserList(server *models.Server, roomId uint64) (userIds []uint64, err error) {
	userIds = make([]uint64, 0)
	conn, err := grpc.Dial(server.String(), grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		fmt.Println("连接失败", server.String())
		return
	}
	defer func() { _ = conn.Close() }()
	c := protobuf.NewWebRTCClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	req := protobuf.GetUserListReq{
		RoomId: roomId,
	}
	rsp, err := c.GetUserList(ctx, &req)
	if err != nil {
		fmt.Println("获取用户列表 发送请求错误:", err)
		return
	}
	if rsp.GetRetCode() != common.OK {
		fmt.Println("获取用户列表 返回码错误:", rsp.String())
		err = errors.New(fmt.Sprintf("发送消息失败 code:%d", rsp.GetRetCode()))
		return
	}
	userIds = rsp.GetUserId()
	fmt.Println("获取用户列表 成功:", userIds)
	return
}

// SendMsg 发送消息
// link::https://github.com/grpc/grpc-go/blob/master/examples/helloworld/greeter_client/main.go
func SendMsg(server *models.Server, roomId uint64, userId uint64, cmd string, msgType string,
	message string) (sendMsgId string, err error) {
	// Set up a connection to the server.
	conn, err := grpc.Dial(server.String(), grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		fmt.Println("连接失败", server.String())
		return
	}
	defer func() { _ = conn.Close() }()
	c := protobuf.NewWebRTCClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	seq := helper.GetOrderIDTime()
	req := protobuf.SendMsgReq{
		Seq:     seq,
		RoomId:  roomId,
		UserId:  userId,
		Cmd:     cmd,
		Type:    msgType,
		Msg:     message,
		IsLocal: false,
	}
	rsp, err := c.SendMsg(ctx, &req)
	if err != nil {
		fmt.Println("发送消息", err)
		return
	}
	if rsp.GetRetCode() != common.OK {
		fmt.Println("发送消息", rsp.String())
		err = errors.New(fmt.Sprintf("发送消息失败 code:%d", rsp.GetRetCode()))
		return
	}
	sendMsgId = rsp.GetSendMsgId()
	fmt.Println("发送消息 成功:", sendMsgId)
	return
}
