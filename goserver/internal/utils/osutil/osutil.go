package osutil

import (
	"os"
	"os/user"
)

// IsFile 给定路径是否为文件
func IsFile(path string) bool {
	f, e := os.Stat(path)
	if e != nil {
		return false
	}
	return !f.IsDir()
}

// IsDir 给定路径是否为目录
func IsDir(dir string) bool {
	f, e := os.Stat(dir)
	if e != nil {
		return false
	}
	return f.IsDir()
}

// IsExist 如果文件或目录存在，则返回true
func IsExist(path string) bool {
	_, err := os.Stat(path)
	return err == nil || os.IsExist(err)
}

// CurrentUsername 返回当前系统用户名
func CurrentUsername() string {
	username := os.Getenv("USER")
	if len(username) > 0 {
		return username
	}

	username = os.Getenv("USERNAME")
	if len(username) > 0 {
		return username
	}

	if u, err := user.Current(); err == nil {
		username = u.Username
	}
	return username
}
