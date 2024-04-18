package cmd

import (
	"wdmeeting/internal/route"

	"github.com/urfave/cli"
)

var Webrtc = cli.Command{
	Name:        "webrtc",
	Usage:       "Start webrtc server",
	Description: `一个视频会议应用`,
	Action:      runWeb,
	Flags: []cli.Flag{
		stringFlag("port, p", "8686", "防止冲突的临时端口号"),
	},
}

func runWeb() {
	route.GlobalInit()
}
