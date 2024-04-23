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

func (c *Client) SendCreateRTCPeerConnection(createOffer bool) {
	iceServers := getIceServers()
	peers := clientManager.GetRoomPeers(c.RoomId)
	c.SendMessage("createRTCPeerConnection", gin.H{
		"userId":            c.UserId,
		"peers":             peers,
		"shouldCreateOffer": createOffer,
		"iceServers":        iceServers,
	})
}

func (c *Client) SendIceCandidate(request *models.IceCandidateRequest) {
	c.SendMessage("iceCandidate", gin.H{
		"userId":       c.UserId,
		"IceCandidate": request.IceCandidate,
	})
}

func (c *Client) SendSessionDescription(request *models.SessionDescriptionRequest) {
	c.SendMessage("sessionDescription", gin.H{
		"userId":             c.UserId,
		"SessionDescription": request.SessionDescription,
	})
}
