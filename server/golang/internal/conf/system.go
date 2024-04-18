package conf

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
)

// IsWindowsRuntime 如果 App 运行在Windows中，则返回true
func IsWindowsRuntime() bool {
	return runtime.GOOS == "windows"
}

// IsProdMode 是否生产模式
func IsProdMode() bool {
	return strings.EqualFold(App.RunMode, "prod")
}

var (
	appPath     string
	appPathOnce sync.Once
)

// AppPath 返回应用程序二进制文件的绝对路径
func AppPath() string {
	appPathOnce.Do(func() {
		var err error
		appPath, err = exec.LookPath(os.Args[0])
		if err != nil {
			panic("look executable path: " + err.Error())
		}

		appPath, err = filepath.Abs(appPath)
		if err != nil {
			panic("get absolute executable path: " + err.Error())
		}
	})

	return appPath
}

var (
	workDir     string
	workDirOnce sync.Once
)

// WorkDir 返回工作目录的绝对路径
// env变量 APP_WORK_DIR 如果未设置，则使用应用程序二进制文件所在的目录
func WorkDir() string {
	workDirOnce.Do(func() {
		workDir = os.Getenv("APP_WORK_DIR")
		if workDir != "" {
			return
		}

		workDir = filepath.Dir(AppPath())
	})

	return workDir
}
