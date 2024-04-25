package cmd

import (
	"github.com/urfave/cli"
	"io.wandao.meeting/internal/server"
)

var Start = cli.Command{
	Name:        "start",
	Usage:       "开始 WebRtc 服务",
	Description: `基本 WebRtc 的在线视频会议服务`,
	Action:      runWebRtc,
}

func runWebRtc(ctx *cli.Context) {
	server.Start()
}
