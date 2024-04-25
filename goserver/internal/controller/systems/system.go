// Package systems 系统查询
package systems

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"io.wandao.meeting/internal/context"
	"runtime"

	"io.wandao.meeting/internal/server/websocket"
)

// Status 查询系统状态
func Status(c *context.APIContext) {
	isDebug := c.Query("isDebug")
	fmt.Println("http_request 查询系统状态", isDebug)

	numGoroutine := runtime.NumGoroutine()
	numCPU := runtime.NumCPU()

	c.Set("data", gin.H{
		"numGoroutine": numGoroutine, // goroutine 的数量
		"numCPU":       numCPU,
		"managerInfo":  websocket.GetManagerInfo(isDebug), // ClientManager 信息
	})
}
