package authutil

import (
  "encoding/base64"
  "net/http"
  "strings"
)

// DecodeBasic 使用HTTP基本身份验证从给定的标头中提取用户名和密码
func DecodeBasic(header http.Header) (username, password string) {
  if len(header) == 0 {
    return "", ""
  }

  fields := strings.Fields(header.Get("Authorization"))
  if len(fields) != 2 || fields[0] != "Basic" {
    return "", ""
  }

  p, err := base64.StdEncoding.DecodeString(fields[1])
  if err != nil {
    return "", ""
  }

  creds := strings.SplitN(string(p), ":", 2)
  if len(creds) == 1 {
    return creds[0], ""
  }
  return creds[0], creds[1]
}
