// Package common 通用函数
package common

// 错误码
const (
	OK               = 200  // Success
	NotLoggedIn      = 1000 // 未登录
	ParameterIllegal = 1001 // 参数不合法
	InvalidUserId    = 1002 // 无效的userId
	InvalidRoomId    = 1003 // 无效的roomId
	Unauthorized     = 1004 // 未授权
	ServerError      = 1005 // 系统错误
	NotData          = 1006 // 没有数据
	NotUser          = 1007
	NotRoom          = 1008
	ModelAddError    = 1009 // 添加错误
	ModelDeleteError = 1010 // 删除错误
	ModelStoreError  = 1011 // 存储错误
	OperationFailure = 1012 // 操作失败
	RoutingNotExist  = 1013 // 路由不存在
	HasLoggedIn      = 1014
)

// GetErrorMessage 根据错误码 获取错误信息
func GetErrorMessage(code uint64, message string) string {
	var codeMessage string
	codeMap := map[uint64]string{
		OK:               "Success",
		NotLoggedIn:      "未登录",
		ParameterIllegal: "参数不合法",
		InvalidUserId:    "无效的用户ID",
		InvalidRoomId:    "无效的房间ID",
		Unauthorized:     "未授权",
		NotData:          "没有数据",
		NotUser:          "用户不存在",
		NotRoom:          "房间不存在",
		ServerError:      "系统错误",
		ModelAddError:    "添加错误",
		ModelDeleteError: "删除错误",
		ModelStoreError:  "存储错误",
		OperationFailure: "操作失败",
		RoutingNotExist:  "路由不存在",
		HasLoggedIn:      "用户已登录",
	}

	if message == "" {
		if value, ok := codeMap[code]; ok {
			// 存在
			codeMessage = value
		} else {
			codeMessage = "未定义错误类型!"
		}
	} else {
		codeMessage = message
	}

	return codeMessage
}
