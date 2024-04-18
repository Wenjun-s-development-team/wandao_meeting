package cryptoutil

import (
	"crypto/md5"
	"encoding/hex"
)

// MD5 将字符串编码为MD5校验和的十六进制
func MD5(str string) string {
	return hex.EncodeToString(MD5Bytes(str))
}

// MD5Bytes 将字符串编码为MD5校验和
func MD5Bytes(str string) []byte {
	m := md5.New()
	_, _ = m.Write([]byte(str))
	return m.Sum(nil)
}
