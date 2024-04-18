package tool

import (
	"path/filepath"
	"strings"
)

// IsSameSiteURLPath 如果URL路径属于同一网站，则返回 true
// False: //url, http://url, /\url
// True: /url
func IsSameSiteURLPath(url string) bool {
	return len(url) >= 2 && url[0] == '/' && url[1] != '/' && url[1] != '\\'
}

// IsMaliciousPath 如果给定的路径是绝对路径或包含可能遍历上层目录的恶意内容，则返回 true
func IsMaliciousPath(path string) bool {
	return filepath.IsAbs(path) || strings.Contains(path, "..")
}
