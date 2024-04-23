package strutil

import (
	"crypto/rand"
	"github.com/google/uuid"
	"math/big"
	"strconv"
	"unicode"
)

// ToUpperFirst returns s with only the first Unicode letter mapped to its upper case.
func ToUpperFirst(s string) string {
	for i, v := range s {
		return string(unicode.ToUpper(v)) + s[i+1:]
	}
	return ""
}

// RandomChars returns a generated string in given number of random characters.
func RandomChars(n int) (string, error) {
	const alphanum = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

	randomInt := func(max *big.Int) (int, error) {
		r, err := rand.Int(rand.Reader, max)
		if err != nil {
			return 0, err
		}

		return int(r.Int64()), nil
	}

	buffer := make([]byte, n)
	maxBig := big.NewInt(int64(len(alphanum)))
	for i := 0; i < n; i++ {
		index, err := randomInt(maxBig)
		if err != nil {
			return "", err
		}

		buffer[i] = alphanum[index]
	}

	return string(buffer), nil
}

// Ellipsis returns a truncated string and appends "..." to the end of the
// string if the string length is larger than the threshold. Otherwise, the
// original string is returned.
func Ellipsis(str string, threshold int) string {
	if len(str) <= threshold || threshold < 0 {
		return str
	}
	return str[:threshold] + "..."
}

// Truncate returns a truncated string if its length is over the limit.
// Otherwise, it returns the original string.
func Truncate(str string, limit int) string {
	if len(str) < limit {
		return str
	}
	return str[:limit]
}

func ToUint32(s string) uint32 {
	// 尝试将字符串解析为uint64
	num, err := strconv.ParseInt(s, 10, 32)
	if err != nil {
		return 0 // 返回错误
	}

	// 安全地将uint64转换为uint32，因为位数已经被限制为32
	return uint32(num)
}

func GenUUID() string {
	return uuid.New().String()
}
