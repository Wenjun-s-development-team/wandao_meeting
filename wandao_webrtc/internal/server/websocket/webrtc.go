package websocket

import (
	"github.com/gin-gonic/gin"
	"io.wandao.meeting/internal/conf"
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
			"password":   conf.Ice.TurnUsername,
			"credential": conf.Ice.TurnCredential,
		})
	}
	return
}

func (c *Client) SendCreateRTCPeerConnection(createOffer bool) {
	iceServers := getIceServers()
	c.SendMessage("createRTCPeerConnection", gin.H{
		"userId":            c.UserId,
		"peers":             nil,
		"shouldCreateOffer": createOffer,
		"iceServers":        iceServers,
	})
}
