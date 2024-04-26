package context

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"io.wandao.meeting/internal/conf"
	"io.wandao.meeting/internal/db"
	"io.wandao.meeting/internal/utils/jwtutil"

	log "unknwon.dev/clog/v2"

	"net/http"
	"net/url"
	"strconv"
	"strings"
)

type APIContext struct {
	*gin.Context
	User *db.User
}

const (
	ErrorCode   = 1
	SuccessCode = 0
)

// ResponseData 响应 JSON 结构体
type ResponseData struct {
	Code    uint8       `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// genResult 按照接口格式生成原数据数组
func genResult(code uint8, message string, data interface{}) ResponseData {
	jsonMap := ResponseData{
		Code:    code,
		Message: message,
		Data:    data,
	}
	return jsonMap
}

// ResultError 响应错误
// c.ResultError("error message")
func (c *APIContext) ResultError(message string) {
	c.JSON(http.StatusOK, ResponseData{
		Code:    ErrorCode,
		Message: message,
		Data:    nil,
	})
}

// ResultSuccess 响应成功
func (c *APIContext) ResultSuccess(data interface{}) {
	if data == nil {
		data = gin.H{}
	}
	c.JSON(http.StatusOK, ResponseData{
		Code:    SuccessCode,
		Message: "success",
		Data:    data,
	})
}

func Handle(handler func(c *APIContext)) func(ctx *gin.Context) {
	return func(c *gin.Context) {
		handler(&APIContext{Context: c})
	}
}

// RecoveryMiddleware 处理 panic 恢复
func RecoveryMiddleware(c *gin.Context) {
	defer func() {
		if err := recover(); err != nil {
			errMsg := fmt.Sprintf("panic: %v\n", err)
			c.JSON(
				http.StatusOK,
				genResult(ErrorCode, errMsg, nil),
			)
			log.Error(errMsg)
			// 终止请求处理
			c.Abort()
		}
	}()
	// 继续处理请求
	c.Next()
}

// CorsMiddleware API接口跨域设置
func CorsMiddleware(ctx *gin.Context) {
	headers := map[string]string{
		"Access-Control-Allow-Methods": strings.Join(conf.Cors.AllowMethods, ","),
		"Access-Control-Allow-Headers": ctx.Request.Header.Get("Access-Control-Request-Headers"),
		"Access-Control-Max-Age":       strconv.FormatFloat(conf.Cors.MaxAge.Seconds(), 'f', 0, 64),
	}
	if conf.Cors.AllowDomain[0] == "*" {
		headers["Access-Control-Allow-Origin"] = "*"
	} else {
		origin := ctx.Request.Header.Get("Origin")
		if origin == "" {
			// Skip non-CORS requests
			return
		}

		u, err := url.Parse(origin)
		if err != nil {
			http.Error(ctx.Writer, fmt.Sprintf("Unable to parse CORS origin header: %v", err), http.StatusBadRequest)
			return
		}

		var ok bool
		for _, d := range conf.Cors.AllowDomain {
			if u.Host == d ||
				(conf.Cors.AllowSubdomain && strings.HasSuffix(u.Host, "."+d)) ||
				d == "!*" {
				ok = true
				break
			}
		}
		if !ok {
			http.Error(ctx.Writer, fmt.Sprintf("CORS request from prohibited domain %v", origin), http.StatusBadRequest)
			return
		}
		if conf.Cors.Scheme != "*" {
			u.Scheme = conf.Cors.Scheme
		}
		headers["Access-Control-Allow-Origin"] = u.String()
		headers["Vary"] = "Origin"

		if conf.Cors.AllowCredentials {
			headers["Access-Control-Allow-Credentials"] = "true"
		}
	}

	for k, v := range headers {
		ctx.Writer.Header().Set(k, v)
	}

	if ctx.Request.Method == http.MethodOptions {
		ctx.Writer.WriteHeader(http.StatusOK)
	}
}

// AuthMiddleware jwt 认证中间件
func AuthMiddleware(ctx *gin.Context) {
	token := ctx.Request.Header.Get("Authorization")
	uc, err := jwtutil.AnalyseToken(token)
	if err != nil {
		ctx.AbortWithStatusJSON(
			http.StatusOK,
			genResult(ErrorCode, "Unauthorized Authorization"+err.Error(), nil),
		)
		return
	}

	if uc == nil {
		ctx.AbortWithStatusJSON(
			http.StatusOK,
			genResult(ErrorCode, "Unauthorized or expired", nil),
		)
		return
	}

	user, err := db.Users.GetByID(ctx, uc.Id)
	if err != nil {
		ctx.AbortWithStatusJSON(
			http.StatusOK,
			genResult(ErrorCode, "Authorized user does not exist", nil),
		)
		return
	}

	// 将授权用户的信息添加到上下文件
	c := &APIContext{
		Context: ctx,
		User:    user,
	}

	c.Next()
}
