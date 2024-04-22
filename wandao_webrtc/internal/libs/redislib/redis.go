// Package redislib redis 库
package redislib

import (
	"context"
	"github.com/redis/go-redis/v9"
	"io.wandao.meeting/internal/conf"
	log "unknwon.dev/clog/v2"
)

var (
	client *redis.Client
)

// GetClient 获取客户端
func GetClient() (c *redis.Client) {
	return client
}

// Init 初始化 Redis 客户端
func Init() {
	client = redis.NewClient(&redis.Options{
		DB:           conf.Redis.DB,
		Addr:         conf.Redis.Addr,
		Password:     conf.Redis.Password,
		PoolSize:     conf.Redis.PoolSize,
		MinIdleConns: conf.Redis.MinIdleConns,
	})

	pong, err := client.Ping(context.Background()).Result()
	log.Trace("initialize Redis. PING response: %v | err:", pong, err)
}
