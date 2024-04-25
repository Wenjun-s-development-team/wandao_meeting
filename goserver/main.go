// Package main 实现一个 webrtc 服务端。
package main

import (
	"github.com/urfave/cli"
	"io.wandao.meeting/cmd"
	"os"

	"io.wandao.meeting/internal/conf"

	log "unknwon.dev/clog/v2"
)

func init() {
	conf.App.Version = "0.0.1"
}

func main() {
	app := cli.NewApp()
	app.Name = "WdMeeting"
	app.Usage = "在线视频会议服务"
	app.Version = conf.App.Version
	app.Commands = []cli.Command{
		cmd.Cert,
		cmd.Start,
	}
	if err := app.Run(os.Args); err != nil {
		log.Fatal("Failed to start application: %v", err)
	}
}
