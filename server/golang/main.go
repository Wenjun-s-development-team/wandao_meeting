package main

import (
	"os"
	"wdmeeting/internal/cmd"
	"wdmeeting/internal/conf"
	"wdmeeting/internal/route"

	log "unknwon.dev/clog/v2"

	"github.com/urfave/cli"
)

func init() {
	conf.App.Version = "0.0.1"
}

func main() {
	app := cli.NewApp()
	app.Name = "WDMeeting"
	app.Usage = "一个视频会议应用"
	app.Version = conf.App.Version
	app.Commands = []cli.Command{
		cmd.Cert,
	}

	if err := app.Run(os.Args); err != nil {
		log.Fatal("Failed to start application: %v", err)
	}

	route.GlobalInit()
}
