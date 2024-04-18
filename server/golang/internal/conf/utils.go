package conf

import (
	"path/filepath"
	"wdmeeting/internal/utils/osutil"
)

// ensureAbs prepends the WorkDir to the given path if it is not an absolute path.
func ensureAbs(path string) string {
	if filepath.IsAbs(path) {
		return path
	}
	return filepath.Join(WorkDir(), path)
}

// CheckRunUser 如果配置的运行用户与运行应用程序的实际用户不匹配，则返回false。第一个返回值是实际的用户名.
func CheckRunUser(runUser string) (string, bool) {
	if IsWindowsRuntime() {
		return "", true
	}

	currentUser := osutil.CurrentUsername()
	return currentUser, runUser == currentUser
}
