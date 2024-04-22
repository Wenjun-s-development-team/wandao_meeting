// Package controllers 控制器
package controller

import (
	"github.com/gin-gonic/gin"
)

type BaseController struct {
	*gin.Context
}
