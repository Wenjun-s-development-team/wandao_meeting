package route

import (
	"wdmeeting/internal/conf"
	"wdmeeting/internal/middlewares"
	"wdmeeting/internal/service"

	log "unknwon.dev/clog/v2"

	"github.com/flamego/auth"
	"github.com/flamego/cors"
	"github.com/flamego/flamego"
)

func Install() *flamego.Flame {
	f := flamego.Classic()

	f.Use(flamego.Renderer())
	f.Use(auth.Bearer("tetwe"))
	f.Use(cors.CORS(cors.Options{
		AllowCredentials: true,
	}))

	f.Get("/", func(token auth.Token) string {
		return "Authenticated through " + string(token)
	})

	// 将 WebRTCSocket 服务器集成到Gin路由器中
	f.Get("/webrtc/p2p/{roomId}/{userId}", service.WebRTCServer)
	f.Post("/webrtc/p2p/{roomId}/{userId}", service.WebRTCServer)

	// 用户登录
	f.Post("/user/login", service.UserLogin)

	f.Group("/user", func() {
		// 用户信息
		f.Get("/info", service.UserInfo)
	}, middlewares.Auth)

	return f
}

func GlobalInit() {
	err := conf.Init()

	if err != nil {
		log.Fatal("Failed to initialize application: %v", err)
	}

	conf.InitLogging(false)
	// db.SetEngine()

	log.Info("%s %s", conf.App.BrandName, conf.App.Version)
	log.Trace("Work directory: %s", conf.WorkDir())
	log.Trace("Log path: %s", conf.Log.RootPath)
	log.Trace("Build time: %s", conf.BuildTime)
	log.Trace("Build commit: %s", conf.BuildCommit)

	f := Install()
	f.Run("0.0.0.0", conf.Server.HTTPPort)
}
