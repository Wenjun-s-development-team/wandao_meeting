// Package grpcserver grpc 服务器
package grpcserver

import (
	"context"
	"fmt"
	"net"

	"io.wandao.meeting/internal/server/models"

	"io.wandao.meeting/internal/conf"

	log "unknwon.dev/clog/v2"

	"google.golang.org/grpc"
	"google.golang.org/protobuf/proto"

	"io.wandao.meeting/internal/common"
	"io.wandao.meeting/internal/protobuf"
	"io.wandao.meeting/internal/server/websocket"
)

type server struct {
	protobuf.UnimplementedWebRTCServer
}

func setErr(rsp proto.Message, code uint64, message string) {
	message = common.GetErrorMessage(code, message)
	switch v := rsp.(type) {
	case *protobuf.QueryUsersOnlineRsp:
		v.RetCode = code
		v.ErrMsg = message
	case *protobuf.SendMsgRsp:
		v.RetCode = code
		v.ErrMsg = message
	case *protobuf.SendMsgAllRsp:
		v.RetCode = code
		v.ErrMsg = message
	case *protobuf.GetUserListRsp:
		v.RetCode = code
		v.ErrMsg = message
	default:
	}
}

// QueryUsersOnline 查询用户是否在线
func (s *server) QueryUsersOnline(c context.Context, req *protobuf.QueryUsersOnlineReq) (rsp *protobuf.QueryUsersOnlineRsp, err error) {

	fmt.Println("grpc_request 查询用户是否在线", req.String())

	rsp = &protobuf.QueryUsersOnlineRsp{}

	online := websocket.CheckUserOnline(req.GetRoomId(), req.GetUserId())

	setErr(req, common.OK, "")
	rsp.Online = online

	return rsp, nil
}

// SendMsg 给本机用户发消息
func (s *server) SendMsg(c context.Context, req *protobuf.SendMsgReq) (rsp *protobuf.SendMsgRsp, err error) {
	fmt.Println("[GRPC] Request: 给本机用户发消息", req.String())
	rsp = &protobuf.SendMsgRsp{}
	if req.GetIsLocal() {
		// 不支持
		setErr(rsp, common.ParameterIllegal, "")
		return
	}
	data := models.GetTextMsgData("message", req.GetMsg(), req.GetUserId())
	sendResults, err := websocket.SendUserMessageLocal(req.GetRoomId(), req.GetUserId(), data)
	if err != nil {
		fmt.Println("[GRPC] 系统错误", err)
		setErr(rsp, common.ServerError, "")
		return rsp, nil
	}
	if !sendResults {
		fmt.Println("[GRPC] 发送失败", err)
		setErr(rsp, common.OperationFailure, "")
		return rsp, nil
	}
	setErr(rsp, common.OK, "")
	fmt.Println("[GRPC] Response: 给本机用户发消息", rsp.String())
	return
}

// SendMsgAll 给本机全体用户发消息
func (s *server) SendMsgAll(c context.Context, req *protobuf.SendMsgAllReq) (rsp *protobuf.SendMsgAllRsp, err error) {
	fmt.Println("grpc_request 给本机全体用户发消息", req.String())
	rsp = &protobuf.SendMsgAllRsp{}
	data := models.GetTextMsgData(models.MessageCmdMessage, req.GetMsg(), req.GetUserId())
	websocket.AllSendMessages(req.GetRoomId(), req.GetUserId(), data)
	setErr(rsp, common.OK, "")
	fmt.Println("grpc_response 给本机全体用户发消息:", rsp.String())
	return
}

// GetUserList 获取本机用户列表
func (s *server) GetUserList(c context.Context, req *protobuf.GetUserListReq) (rsp *protobuf.GetUserListRsp,
	err error) {

	fmt.Println("grpc_request 获取本机用户列表", req.String())

	roomId := req.GetRoomId()
	rsp = &protobuf.GetUserListRsp{}

	// 本机
	userList := websocket.GetUserList(roomId)

	setErr(rsp, common.OK, "")
	rsp.UserId = userList

	fmt.Println("grpc_response 获取本机用户列表:", rsp.String())

	return
}

// Init rpc server
// link::https://github.com/grpc/grpc-go/blob/master/examples/helloworld/greeter_server/main.go
func Init() {
	rpcPort := conf.Server.RPCPort
	log.Trace("RPC Server Listen on: %s", rpcPort)
	lis, err := net.Listen("tcp", ":"+rpcPort)
	if err != nil {
		log.Fatal("failed to listen: %v", err)
	}
	s := grpc.NewServer()
	protobuf.RegisterWebRTCServer(s, &server{})
	if err := s.Serve(lis); err != nil {
		log.Fatal("failed to serve: %v", err)
	}
}
