package middlewares

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"wdmeeting/result"
)

// ResponseHandler 统一HTTP响应格式
func ResponseHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
		// 检查是否在处理请求时发生了错误
		if len(c.Errors) > 0 {
			err := c.Errors.Last()
			result.Error(c, err.Error())
			return
		}
		// 检查是否设置了响应状态码
		if c.Writer.Status() == 0 {
			c.Writer.WriteHeader(http.StatusOK)
		}
		// 如果没有错误，则格式化响应
		if c.Writer.Status() >= http.StatusOK && c.Writer.Status() < http.StatusMultipleChoices {
			data, exists := c.Get("data")
			if exists {
				result.Success(c, data)
				return
			}
		}
	}
}

// ErrorHandler 全局错误处理
func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				c.JSON(400, gin.H{"message": err})
			}
		}()
	}
}
