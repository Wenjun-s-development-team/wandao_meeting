package route

import (
	"wdmeeting/internal/conf"
	"wdmeeting/internal/context/webrtc"
	"wdmeeting/internal/service"

	"github.com/flamego/cors"
	"github.com/flamego/flamego"
)

func APIServer() *flamego.Flame {
	f := flamego.New()

	if !conf.Server.DisableRouterLog {
		f.Use(flamego.Logger())
	}

	f.Use(webrtc.Recovery())
	f.Use(webrtc.Invoker())

	f.Use(cors.CORS(cors.Options{
		MaxAge:           conf.Cors.MaxAge,
		Methods:          conf.Cors.AllowMethods,
		AllowDomain:      conf.Cors.AllowDomain,
		AllowSubdomain:   conf.Cors.AllowSubdomain,
		AllowCredentials: conf.Cors.AllowCredentials,
	}))

	// 将 WebRTCSocket 服务器集成到Gin路由器中
	f.Get("/webrtc/p2p/{roomId}/{userId}", service.WebRTCServer)
	f.Post("/webrtc/p2p/{roomId}/{userId}", service.WebRTCServer)

	// 用户登录
	f.Post("/user/login", service.UserLogin)

	f.Group("/user", func() {
		// 用户信息
		f.Get("/info", service.UserInfo)
	}, webrtc.Auth())

	return f
}
