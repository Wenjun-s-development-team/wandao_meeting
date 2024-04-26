// Package websocket 处理
package websocket

import (
	"fmt"
	"sync"
	"time"

	jsoniter "github.com/json-iterator/go"
	"io.wandao.meeting/internal/helper"
	"io.wandao.meeting/internal/server/models"

	log "unknwon.dev/clog/v2"

	"io.wandao.meeting/internal/libs/cache"
)

// ClientManager 连接管理
type ClientManager struct {
	Clients     map[*Client]bool                    // 全部的连接
	ClientsLock sync.RWMutex                        // 读写锁
	Users       map[string]*Client                  // 登录的用户 key=roomId+userId
	Peers       map[uint64]map[uint64]*models.Peers // [roomId][userId]
	UserLock    sync.RWMutex                        // 读写锁
	PeersLock   sync.RWMutex                        // 读写锁
	Register    chan *Client                        // 连接连接处理
	Login       chan *login                         // 用户登录处理
	Unregister  chan *Client                        // 断开连接处理程序
	Broadcast   chan []byte                         // 广播 向全部成员发送数据
}

// NewClientManager 创建连接管理
func NewClientManager() (clientManager *ClientManager) {
	clientManager = &ClientManager{
		Clients:    make(map[*Client]bool),
		Users:      make(map[string]*Client),
		Peers:      make(map[uint64]map[uint64]*models.Peers),
		Register:   make(chan *Client, 1000),
		Login:      make(chan *login, 1000),
		Unregister: make(chan *Client, 1000),
		Broadcast:  make(chan []byte, 1000),
	}
	return
}

// GetUserKey 获取用户key
func GetUserKey(roomId uint64, userId uint64) (key string) {
	key = fmt.Sprintf("%d_%d", roomId, userId)
	return
}

func (manager *ClientManager) InClient(client *Client) (ok bool) {
	manager.ClientsLock.RLock()
	defer manager.ClientsLock.RUnlock()

	// 连接存在，在添加
	_, ok = manager.Clients[client]
	return
}

// GetClients 获取所有客户端
func (manager *ClientManager) GetClients() (clients map[*Client]bool) {
	clients = make(map[*Client]bool)
	manager.ClientsRange(func(client *Client, value bool) (result bool) {
		clients[client] = value
		return true
	})
	return
}

// ClientsRange 遍历
func (manager *ClientManager) ClientsRange(f func(client *Client, value bool) (result bool)) {
	manager.ClientsLock.RLock()
	defer manager.ClientsLock.RUnlock()
	for key, value := range manager.Clients {
		result := f(key, value)
		if !result {
			return
		}
	}
}

// GetClientsLen GetClientsLen
func (manager *ClientManager) GetClientsLen() (clientsLen int) {
	clientsLen = len(manager.Clients)
	return
}

// AddClients 添加客户端
func (manager *ClientManager) AddClients(client *Client) {
	manager.ClientsLock.Lock()
	defer manager.ClientsLock.Unlock()
	manager.Clients[client] = true
}

// DelClients 删除客户端
func (manager *ClientManager) DelClients(client *Client) {
	manager.ClientsLock.Lock()
	defer manager.ClientsLock.Unlock()
	if manager.Clients[client] {
		delete(manager.Clients, client)
	}
}

// GetUserClient 获取用户的连接
func (manager *ClientManager) GetUserClient(roomId uint64, userId uint64) (client *Client) {
	manager.UserLock.RLock()
	defer manager.UserLock.RUnlock()
	userKey := GetUserKey(roomId, userId)
	if value, ok := manager.Users[userKey]; ok {
		client = value
	}
	return
}

// GetUsersLen GetClientsLen
func (manager *ClientManager) GetUsersLen() (userLen int) {
	userLen = len(manager.Users)
	return
}

// AddUsers 添加用户
func (manager *ClientManager) AddUsers(key string, client *Client) {
	manager.UserLock.Lock()
	defer manager.UserLock.Unlock()
	manager.Users[key] = client
}

// AddPeers 添加房间信息
func (manager *ClientManager) AddPeers(client *Client, roomInfo *models.Peers) {
	manager.PeersLock.Lock()
	defer manager.PeersLock.Unlock()
	if _, ok := manager.Peers[client.RoomId]; !ok {
		clientManager.Peers[client.RoomId] = make(map[uint64]*models.Peers)
	}
	manager.Peers[client.RoomId][client.UserId] = roomInfo
}

// DelPeers 删除房间信息
func (manager *ClientManager) DelPeers(client *Client) {
	manager.PeersLock.Lock()
	defer manager.PeersLock.Unlock()
	delete(manager.Peers[client.RoomId], client.UserId)
	if len(manager.Peers[client.RoomId]) == 0 {
		delete(manager.Peers, client.UserId)
	}
}

// DelUsers 删除用户
func (manager *ClientManager) DelUsers(client *Client) (result bool) {
	manager.UserLock.Lock()
	defer manager.UserLock.Unlock()
	key := GetUserKey(client.RoomId, client.UserId)
	if value, ok := manager.Users[key]; ok {
		// 判断是否为相同的用户
		if value.Addr != client.Addr {
			return
		}
		delete(manager.Users, key)
		manager.DelPeers(client)
		result = true
	}
	return
}

// GetUserKeys 获取用户的key
func (manager *ClientManager) GetUserKeys() (userKeys []string) {
	userKeys = make([]string, 0)
	manager.UserLock.RLock()
	defer manager.UserLock.RUnlock()
	for key := range manager.Users {
		userKeys = append(userKeys, key)
	}
	return
}

// GetUserList 获取用户 list
func (manager *ClientManager) GetUserList(roomId uint64) (userList []uint64) {
	userList = make([]uint64, 0)
	manager.UserLock.RLock()
	defer manager.UserLock.RUnlock()
	for _, v := range manager.Users {
		if v.RoomId == roomId {
			userList = append(userList, v.UserId)
		}
	}
	log.Info("GetUserList len: %d", len(manager.Users))
	return
}

// GetRoomPeers 获取房间信息
func (manager *ClientManager) GetRoomPeers(roomId uint64) (peers map[uint64]*models.Peers) {
	manager.PeersLock.RLock()
	defer manager.PeersLock.RUnlock()
	peers = manager.Peers[roomId]
	log.Info("GetRoomPeers len: %d", len(peers))
	return
}

// GetUserClients 获取用户的key
func (manager *ClientManager) GetUserClients() (clients []*Client) {
	clients = make([]*Client, 0)
	manager.UserLock.RLock()
	defer manager.UserLock.RUnlock()
	for _, v := range manager.Users {
		clients = append(clients, v)
	}
	return
}

// EventRegister 用户建立连接事件
func (manager *ClientManager) EventRegister(client *Client) {
	manager.AddClients(client)
	log.Info("EventRegister 用户建立连接: %s", client.Addr)
	// client.Send <- []byte("连接成功")
}

// EventLogin 用户登录
func (manager *ClientManager) EventLogin(login *login) {
	client := login.Client
	// 连接存在，在添加
	if manager.InClient(client) {
		userKey := login.GetKey()
		manager.AddPeers(login.Client, login.Peers)
		CreateRoomRTCPeerConnection(client)
		manager.AddUsers(userKey, login.Client)
	}
	log.Info("EventLogin 用户登录: %s|%d|%d", client.Addr, login.RoomId, login.UserId)
	_, _ = SendUserMessageAll(models.MessageCmdConnect, "哈喽~", login.RoomId, login.UserId)
}

// EventUnregister 用户断开连接
func (manager *ClientManager) EventUnregister(client *Client) {
	manager.DelClients(client)

	// 删除用户连接
	deleteResult := manager.DelUsers(client)
	if deleteResult {
		// 不是当前连接的客户端
		return
	}

	// 清除redis登录数据
	userOnline, err := cache.GetUserOnlineInfo(client.GetKey())
	if err == nil {
		userOnline.LogOut()
		_ = cache.SetUserOnlineInfo(client.GetKey(), userOnline)
	}

	// 关闭 chan
	// close(client.Send)
	log.Info("EventUnregister 用户断开连接: %s|%d|%d", client.Addr, client.RoomId, client.UserId)
	if client.UserId > 0 {
		msg, err := jsoniter.Marshal(models.SendRequest{
			Seq: helper.GetOrderIDTime(),
			Cmd: models.MessageCmdExit,
			Data: map[string]interface{}{
				"roomId":  client.RoomId,
				"userId":  client.UserId,
				"message": "用户已经离开",
			},
		})
		if err != nil {
			return
		}
		manager.sendRoomIdAll(msg, client.RoomId, client)
	}
}

// 管道处理程序
func (manager *ClientManager) start() {
	for {
		select {
		case conn := <-manager.Register:
			// 建立连接事件
			manager.EventRegister(conn)
		case l := <-manager.Login:
			// 用户登录
			manager.EventLogin(l)
		case conn := <-manager.Unregister:
			// 断开连接事件
			manager.EventUnregister(conn)
		case message := <-manager.Broadcast:
			// 广播事件
			clients := manager.GetClients()
			for conn := range clients {
				select {
				case conn.Send <- message:
				default:
					close(conn.Send)
				}
			}
		}
	}
}

// GetManagerInfo 获取管理者信息
func GetManagerInfo(isDebug string) (managerInfo map[string]interface{}) {
	managerInfo = make(map[string]interface{})
	managerInfo["clientsLen"] = clientManager.GetClientsLen()        // 客户端连接数
	managerInfo["usersLen"] = clientManager.GetUsersLen()            // 登录用户数
	managerInfo["chanRegisterLen"] = len(clientManager.Register)     // 未处理连接事件数
	managerInfo["chanLoginLen"] = len(clientManager.Login)           // 未处理登录事件数
	managerInfo["chanUnregisterLen"] = len(clientManager.Unregister) // 未处理退出登录事件数
	managerInfo["chanBroadcastLen"] = len(clientManager.Broadcast)   // 未处理广播事件数
	if isDebug == "true" {
		addrList := make([]string, 0)
		clientManager.ClientsRange(func(client *Client, value bool) (result bool) {
			addrList = append(addrList, client.Addr)
			return true
		})
		users := clientManager.GetUserKeys()
		managerInfo["clients"] = addrList // 客户端列表
		managerInfo["users"] = users      // 登录用户列表
	}
	return
}

// GetUserClient 获取用户所在的连接
func GetUserClient(roomId uint64, userId uint64) (client *Client) {
	client = clientManager.GetUserClient(roomId, userId)
	return
}

// ClearTimeoutConnections 定时清理超时连接
func ClearTimeoutConnections() {
	currentTime := uint64(time.Now().Unix())
	clients := clientManager.GetClients()
	for client := range clients {
		if client.IsHeartbeatTimeout(currentTime) {
			log.Info("[websocket]心跳时间超时 关闭连接 %s %d %d %d", client.Addr, client.UserId, client.LoginTime, client.HeartbeatTime)
			_ = client.Socket.Close()
		}
	}
}

// GetUserList 获取全部用户
func GetUserList(roomId uint64) (userList []uint64) {
	log.Info("[websocket]获取全部用户 %d", roomId)
	userList = clientManager.GetUserList(roomId)
	return
}

// sendAll 向全部成员(除了自己)发送数据
func (manager *ClientManager) sendAll(message []byte, self *Client) {
	clients := manager.GetUserClients()
	for _, conn := range clients {
		if conn != self {
			conn.SendMsg(message)
		}
	}
}

// sendRoomIdAll 向房间内全部成员(除了自己)发送数据
func (manager *ClientManager) sendRoomIdAll(message []byte, roomId uint64, self *Client) {
	clients := manager.GetUserClients()
	for _, conn := range clients {
		if conn != self && conn.RoomId == roomId {
			conn.SendMsg(message)
		}
	}
}

// AllSendMessages 全员广播
func AllSendMessages(roomId uint64, userId uint64, data string) {
	log.Info("[websocket]全员广播 %d %d %s", roomId, userId, data)
	ignoreClient := clientManager.GetUserClient(roomId, userId)
	clientManager.sendRoomIdAll([]byte(data), roomId, ignoreClient)
}

// SendUserMessageAll 给全体用户发消息
func SendUserMessageAll(cmd string, message string, roomId uint64, userId uint64) (sendResults bool, err error) {
	sendResults = true
	data := models.GetTextMsgData(cmd, message, userId)
	AllSendMessages(roomId, userId, data)
	return
}
