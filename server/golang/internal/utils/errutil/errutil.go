package errutil

// NotFound 未找到错误
type NotFound interface {
	NotFound() bool
}

// IsNotFound 未找到返回 true
func IsNotFound(err error) bool {
	e, ok := err.(NotFound)
	return ok && e.NotFound()
}

// Args 错误的上下文键值对映射
type Args map[string]any
