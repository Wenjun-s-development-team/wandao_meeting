package result

import (
	"github.com/gin-gonic/gin"
	"net/http"
)

const (
	ERROR   = 1
	SUCCESS = 0
)

type ResponseData struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

// Error 错误响应
func Error(c *gin.Context, message string) {
	c.JSON(http.StatusOK, ResponseData{
		Code:    ERROR,
		Message: message,
		Data:    nil,
	})
}

// Success 成功响应
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, ResponseData{
		Code:    SUCCESS,
		Message: "success",
		Data:    data,
	})
}
