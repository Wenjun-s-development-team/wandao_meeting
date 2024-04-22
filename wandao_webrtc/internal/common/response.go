// Package common 通用函数
package common

// JSONResult json 返回结构体
type JSONResult struct {
	Code uint64      `json:"code"`
	Msg  string      `json:"msg"`
	Data interface{} `json:"data"`
}

// Response 响应数据结构
func Response(code uint64, message string, data interface{}) JSONResult {
	message = GetErrorMessage(code, message)
	jsonMap := grantMap(code, message, data)
	return jsonMap
}

// grantMap 按照接口格式生成原数据数组
func grantMap(code uint64, message string, data interface{}) JSONResult {
	jsonMap := JSONResult{
		Code: code,
		Msg:  message,
		Data: data,
	}
	return jsonMap
}
