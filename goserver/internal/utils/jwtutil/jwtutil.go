package jwtutil

import (
	"encoding/base64"
	"encoding/json"
	"fmt"

	"io.wandao.meeting/internal/conf"

	"github.com/golang-jwt/jwt/v5"
)

type UserClaims struct {
	Id   uint64 `json:"id"`
	Name string `json:"name"`
	jwt.RegisteredClaims
}

// GenerateToken 生成 token
func GenerateToken(id uint64, name string) (string, error) {
	UserClaim := &UserClaims{
		Id:               id,
		Name:             name,
		RegisteredClaims: jwt.RegisteredClaims{},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, UserClaim)
	tokenString, err := token.SignedString([]byte(conf.Security.SecretKey))
	if err != nil {
		return "", err
	}
	return tokenString, nil
}

// AnalyseToken 解析 token
func AnalyseToken(tokenString string) (*UserClaims, error) {
	userClaim := new(UserClaims)
	claims, err := jwt.ParseWithClaims(tokenString, userClaim, func(token *jwt.Token) (interface{}, error) {
		return []byte(conf.Security.SecretKey), nil
	})
	if err != nil {
		return nil, err
	}
	if !claims.Valid {
		return nil, fmt.Errorf("analyse Token Error:%v", err)
	}
	return userClaim, nil
}

func Encode(obj interface{}) string {
	b, err := json.Marshal(obj)
	if err != nil {
		panic(err)
	}
	return base64.StdEncoding.EncodeToString(b)
}

func Decode(in string, obj interface{}) {
	b, err := base64.StdEncoding.DecodeString(in)
	if err != nil {
		panic(err)
	}
	err = json.Unmarshal(b, obj)
	if err != nil {
		panic(err)
	}
}
