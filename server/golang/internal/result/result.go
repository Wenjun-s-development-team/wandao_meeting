package result

import (
	"net/http"

	"github.com/flamego/flamego"
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
func Error(r flamego.Render, message string) {
	r.JSON(http.StatusOK, ResponseData{
		Code:    ERROR,
		Message: message,
		Data:    nil,
	})
}

// Success 成功响应
func Success(r flamego.Render, data interface{}) {
	r.JSON(http.StatusOK, ResponseData{
		Code:    SUCCESS,
		Message: "success",
		Data:    data,
	})
}
