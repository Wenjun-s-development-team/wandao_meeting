// Code generated by protoc-gen-go-grpc. DO NOT EDIT.
// versions:
// - protoc-gen-go-grpc v1.3.0
// - protoc             v5.26.1
// source: protobuf.proto

package protobuf

import (
	context "context"
	grpc "google.golang.org/grpc"
	codes "google.golang.org/grpc/codes"
	status "google.golang.org/grpc/status"
)

// This is a compile-time assertion to ensure that this generated file
// is compatible with the grpc package it is being compiled against.
// Requires gRPC-Go v1.32.0 or later.
const _ = grpc.SupportPackageIsVersion7

const (
	WebRTC_QueryUsersOnline_FullMethodName = "/protobuf.WebRTC/QueryUsersOnline"
	WebRTC_SendMsg_FullMethodName          = "/protobuf.WebRTC/SendMsg"
	WebRTC_SendMsgAll_FullMethodName       = "/protobuf.WebRTC/SendMsgAll"
	WebRTC_GetUserList_FullMethodName      = "/protobuf.WebRTC/GetUserList"
)

// WebRTCClient is the client API for WebRTC service.
//
// For semantics around ctx use and closing/ending streaming RPCs, please refer to https://pkg.go.dev/google.golang.org/grpc/?tab=doc#ClientConn.NewStream.
type WebRTCClient interface {
	// 查询用户是否在线
	QueryUsersOnline(ctx context.Context, in *QueryUsersOnlineReq, opts ...grpc.CallOption) (*QueryUsersOnlineRsp, error)
	// 发送消息
	SendMsg(ctx context.Context, in *SendMsgReq, opts ...grpc.CallOption) (*SendMsgRsp, error)
	// 给这台机器的房间内所有用户发送消息
	SendMsgAll(ctx context.Context, in *SendMsgAllReq, opts ...grpc.CallOption) (*SendMsgAllRsp, error)
	// 获取用户列表
	GetUserList(ctx context.Context, in *GetUserListReq, opts ...grpc.CallOption) (*GetUserListRsp, error)
}

type webRTCClient struct {
	cc grpc.ClientConnInterface
}

func NewWebRTCClient(cc grpc.ClientConnInterface) WebRTCClient {
	return &webRTCClient{cc}
}

func (c *webRTCClient) QueryUsersOnline(ctx context.Context, in *QueryUsersOnlineReq, opts ...grpc.CallOption) (*QueryUsersOnlineRsp, error) {
	out := new(QueryUsersOnlineRsp)
	err := c.cc.Invoke(ctx, WebRTC_QueryUsersOnline_FullMethodName, in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (c *webRTCClient) SendMsg(ctx context.Context, in *SendMsgReq, opts ...grpc.CallOption) (*SendMsgRsp, error) {
	out := new(SendMsgRsp)
	err := c.cc.Invoke(ctx, WebRTC_SendMsg_FullMethodName, in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (c *webRTCClient) SendMsgAll(ctx context.Context, in *SendMsgAllReq, opts ...grpc.CallOption) (*SendMsgAllRsp, error) {
	out := new(SendMsgAllRsp)
	err := c.cc.Invoke(ctx, WebRTC_SendMsgAll_FullMethodName, in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (c *webRTCClient) GetUserList(ctx context.Context, in *GetUserListReq, opts ...grpc.CallOption) (*GetUserListRsp, error) {
	out := new(GetUserListRsp)
	err := c.cc.Invoke(ctx, WebRTC_GetUserList_FullMethodName, in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

// WebRTCServer is the server API for WebRTC service.
// All implementations must embed UnimplementedWebRTCServer
// for forward compatibility
type WebRTCServer interface {
	// 查询用户是否在线
	QueryUsersOnline(context.Context, *QueryUsersOnlineReq) (*QueryUsersOnlineRsp, error)
	// 发送消息
	SendMsg(context.Context, *SendMsgReq) (*SendMsgRsp, error)
	// 给这台机器的房间内所有用户发送消息
	SendMsgAll(context.Context, *SendMsgAllReq) (*SendMsgAllRsp, error)
	// 获取用户列表
	GetUserList(context.Context, *GetUserListReq) (*GetUserListRsp, error)
	mustEmbedUnimplementedWebRTCServer()
}

// UnimplementedWebRTCServer must be embedded to have forward compatible implementations.
type UnimplementedWebRTCServer struct {
}

func (UnimplementedWebRTCServer) QueryUsersOnline(context.Context, *QueryUsersOnlineReq) (*QueryUsersOnlineRsp, error) {
	return nil, status.Errorf(codes.Unimplemented, "method QueryUsersOnline not implemented")
}
func (UnimplementedWebRTCServer) SendMsg(context.Context, *SendMsgReq) (*SendMsgRsp, error) {
	return nil, status.Errorf(codes.Unimplemented, "method SendMsg not implemented")
}
func (UnimplementedWebRTCServer) SendMsgAll(context.Context, *SendMsgAllReq) (*SendMsgAllRsp, error) {
	return nil, status.Errorf(codes.Unimplemented, "method SendMsgAll not implemented")
}
func (UnimplementedWebRTCServer) GetUserList(context.Context, *GetUserListReq) (*GetUserListRsp, error) {
	return nil, status.Errorf(codes.Unimplemented, "method GetUserList not implemented")
}
func (UnimplementedWebRTCServer) mustEmbedUnimplementedWebRTCServer() {}

// UnsafeWebRTCServer may be embedded to opt out of forward compatibility for this service.
// Use of this interface is not recommended, as added methods to WebRTCServer will
// result in compilation errors.
type UnsafeWebRTCServer interface {
	mustEmbedUnimplementedWebRTCServer()
}

func RegisterWebRTCServer(s grpc.ServiceRegistrar, srv WebRTCServer) {
	s.RegisterService(&WebRTC_ServiceDesc, srv)
}

func _WebRTC_QueryUsersOnline_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(QueryUsersOnlineReq)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(WebRTCServer).QueryUsersOnline(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: WebRTC_QueryUsersOnline_FullMethodName,
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(WebRTCServer).QueryUsersOnline(ctx, req.(*QueryUsersOnlineReq))
	}
	return interceptor(ctx, in, info, handler)
}

func _WebRTC_SendMsg_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(SendMsgReq)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(WebRTCServer).SendMsg(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: WebRTC_SendMsg_FullMethodName,
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(WebRTCServer).SendMsg(ctx, req.(*SendMsgReq))
	}
	return interceptor(ctx, in, info, handler)
}

func _WebRTC_SendMsgAll_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(SendMsgAllReq)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(WebRTCServer).SendMsgAll(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: WebRTC_SendMsgAll_FullMethodName,
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(WebRTCServer).SendMsgAll(ctx, req.(*SendMsgAllReq))
	}
	return interceptor(ctx, in, info, handler)
}

func _WebRTC_GetUserList_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(GetUserListReq)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(WebRTCServer).GetUserList(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: WebRTC_GetUserList_FullMethodName,
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(WebRTCServer).GetUserList(ctx, req.(*GetUserListReq))
	}
	return interceptor(ctx, in, info, handler)
}

// WebRTC_ServiceDesc is the grpc.ServiceDesc for WebRTC service.
// It's only intended for direct use with grpc.RegisterService,
// and not to be introspected or modified (even as a copy)
var WebRTC_ServiceDesc = grpc.ServiceDesc{
	ServiceName: "protobuf.WebRTC",
	HandlerType: (*WebRTCServer)(nil),
	Methods: []grpc.MethodDesc{
		{
			MethodName: "QueryUsersOnline",
			Handler:    _WebRTC_QueryUsersOnline_Handler,
		},
		{
			MethodName: "SendMsg",
			Handler:    _WebRTC_SendMsg_Handler,
		},
		{
			MethodName: "SendMsgAll",
			Handler:    _WebRTC_SendMsgAll_Handler,
		},
		{
			MethodName: "GetUserList",
			Handler:    _WebRTC_GetUserList_Handler,
		},
	},
	Streams:  []grpc.StreamDesc{},
	Metadata: "protobuf.proto",
}
