package webrtc

import (
	"encoding/xml"
	"github.com/flamego/flamego"
	"github.com/goccy/go-json"
	"io"
	"net/http"
	"wdmeeting/internal/utils/jwtutil"

	log "unknwon.dev/clog/v2"
)

type Context interface {
	flamego.Context
	ToJson(s interface{}) error
}

type context struct {
	flamego.Context
}

type Render interface {
	JSON(status int, v interface{})
	XML(status int, v interface{})
	Binary(status int, v []byte)
	PlainText(status int, s string)

	ErrorJson(m string)
	SuccessJson(d interface{})
}

type RenderOptions struct {
	Charset    string
	JSONIndent string
	XMLIndent  string
}

type render struct {
	responseWriter flamego.ResponseWriter
}

type ResponseData struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

var renderOptions = RenderOptions{
	Charset:    "UTF-8",
	JSONIndent: "  ",
	XMLIndent:  "  ",
}

type UserClaims struct {
	User jwtutil.UserClaims
}

const (
	ErrorCode   = 1
	SuccessCode = 0
)

// ErrorJson 响应错误
func (r *render) ErrorJson(message string) {
	r.JSON(http.StatusOK, ResponseData{
		Code:    ErrorCode,
		Message: message,
		Data:    nil,
	})
}

// SuccessJson 响应成功
func (r *render) SuccessJson(data interface{}) {
	r.JSON(http.StatusOK, ResponseData{
		Code:    SuccessCode,
		Message: "success",
		Data:    data,
	})
}

// JSON 响应 JSON
func (r *render) JSON(status int, v interface{}) {
	r.responseWriter.Header().Set("Content-Type", "application/json; charset="+renderOptions.Charset)
	r.responseWriter.WriteHeader(status)

	enc := json.NewEncoder(r.responseWriter)
	if renderOptions.JSONIndent != "" {
		enc.SetIndent("", renderOptions.JSONIndent)
	}

	err := enc.Encode(v)
	if err != nil {
		http.Error(r.responseWriter, err.Error(), http.StatusInternalServerError)
		return
	}
}

// XML 响应 XML
func (r *render) XML(status int, v interface{}) {
	r.responseWriter.Header().Set("Content-Type", "text/xml; charset="+renderOptions.Charset)
	r.responseWriter.WriteHeader(status)

	enc := xml.NewEncoder(r.responseWriter)
	if renderOptions.XMLIndent != "" {
		enc.Indent("", renderOptions.XMLIndent)
	}

	err := enc.Encode(v)
	if err != nil {
		http.Error(r.responseWriter, err.Error(), http.StatusInternalServerError)
		return
	}
}

// Binary 响应 Binary
func (r *render) Binary(status int, v []byte) {
	r.responseWriter.Header().Set("Content-Type", "application/octet-stream")
	r.responseWriter.WriteHeader(status)
	_, _ = r.responseWriter.Write(v)
}

// PlainText 响应文本
func (r *render) PlainText(status int, s string) {
	r.responseWriter.Header().Set("Content-Type", "text/plain; charset="+renderOptions.Charset)
	r.responseWriter.WriteHeader(status)
	_, _ = r.responseWriter.Write([]byte(s))
}

// ToJson 请求的数据转 JSON
func (c context) ToJson(s interface{}) error {
	req := c.Request().Request
	body, err := io.ReadAll(req.Body)
	if err != nil {
		return err // 返回读取错误
	}
	defer req.Body.Close()
	// 反序列化JSON到 s 指向的对象
	err = json.Unmarshal(body, s)
	if err != nil {
		return err
	}
	return nil
}

// Invoker 统一返回 ｜ 解析JSON 中间件
func Invoker() flamego.Handler {
	return flamego.ContextInvoker(func(ctx flamego.Context) {
		c := &context{Context: ctx}
		r := &render{
			responseWriter: ctx.ResponseWriter(),
		}

		ctx.MapTo(c, (*Context)(nil)) // 解析JSON
		ctx.MapTo(r, (*Render)(nil))  // 统一返回
	})
}

// Auth JwT 认证中间件
func Auth() flamego.Handler {
	return flamego.ContextInvoker(func(ctx flamego.Context) {
		r := &render{
			responseWriter: ctx.ResponseWriter(),
		}

		token := ctx.Request().Header.Get("Authorization")

		log.Info("Authorization token value: %s", token)

		uc, err := jwtutil.AnalyseToken(token)

		if err != nil || uc == nil {
			r.ErrorJson("Unauthorized Authorization" + err.Error())
			return
		}

		userClaim := UserClaims{
			User: *uc,
		}

		ctx.Map(userClaim)
	})
}
