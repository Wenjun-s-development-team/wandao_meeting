package websocket

import (
	"github.com/gin-gonic/gin"
	"io.wandao.meeting/internal/conf"
	"io.wandao.meeting/internal/server/models"
)

func getIceServers() (iceServers []map[string]interface{}) {
	if conf.Ice.StunEnabled {
		iceServers = append(iceServers, gin.H{
			"urls": conf.Ice.StunUrls,
		})
	}

	if conf.Ice.TurnEnabled {
		iceServers = append(iceServers, gin.H{
			"urls":       conf.Ice.TurnUrls,
			"username":   conf.Ice.TurnUsername,
			"credential": conf.Ice.TurnCredential,
		})
	}
	return
}

// CreateRoomRTCPeerConnection 用户登录后 通知客户端创建 offer
// 应先于 clientManager.AddUsers 执行该通知
func CreateRoomRTCPeerConnection(client *Client) {
	clientManager.UserLock.RLock()
	defer clientManager.UserLock.RUnlock()
	// 用户登录后，尚未注册该用户到 clientManager.Users
	// 因此只会向已经注册的用户发送通知
	for _, other := range clientManager.Users {
		if other.RoomId == client.RoomId {
			// 向其它用户发送通知
			other.SendCreateRTCPeerConnection(client.UserId, false)
			// 向自己发送通知
			client.SendCreateRTCPeerConnection(other.UserId, true)
		}
	}
}

func (c *Client) SendCreateRTCPeerConnection(userId uint64, createOffer bool) {
	iceServers := getIceServers()
	peers := clientManager.GetRoomPeers(c.RoomId)
	c.SendMessage("createRTCPeerConnection", gin.H{
		"userId":            userId,
		"peers":             peers,
		"shouldCreateOffer": createOffer,
		"iceServers":        iceServers,
	})
}

func (c *Client) SendIceCandidate(request *models.IceCandidateRequest) {
	client := clientManager.GetUserClient(c.RoomId, request.UserId)
	client.SendMessage("iceCandidate", gin.H{
		"userId":       c.UserId,
		"iceCandidate": request.IceCandidate,
	})
}

func (c *Client) SendSessionDescription(request *models.SessionDescriptionRequest) {
	client := clientManager.GetUserClient(c.RoomId, request.UserId)
	client.SendMessage("sessionDescription", gin.H{
		"userId":             c.UserId,
		"sessionDescription": request.SessionDescription,
	})
}
