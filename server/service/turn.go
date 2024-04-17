//go:build !wasm

package service

import (
	"context"
	"flag"
	"log"
	"net"
	"os"
	"os/signal"
	"regexp"
	"strconv"
	"syscall"

	turn "github.com/pion/turn/v3"
	"golang.org/x/sys/unix"
)

func Turn() {
	publicIP := flag.String("public-ip", "47.109.53.182", "公网IP地址.")
	port := flag.Int("port", 3478, "监听端口.")
	users := flag.String("users", "admin=admin", "用户/密码(username=password,username=password,)")
	realm := flag.String("realm", "47.109.53.182", "Realm (defaults to \"pion.ly\")")
	threadNum := flag.Int("thread-num", 1, "服务器线程数 (defaults to 1)")

	if len(*publicIP) == 0 {
		log.Fatalf("'public-ip' is required")
	} else if len(*users) == 0 {
		log.Fatalf("'users' is required")
	}

	addr, err := net.ResolveUDPAddr("udp", "0.0.0.0:"+strconv.Itoa(*port))
	if err != nil {
		log.Fatalf("Failed to parse server address: %s", err)
	}

	// 缓存-用户标志便于以后查找
	// 如果存储了密码，则应使用turn将其保存到经过哈希处理的数据库中。生成AuthKey
	usersMap := map[string][]byte{}
	for _, kv := range regexp.MustCompile(`(\w+)=(\w+)`).FindAllStringSubmatch(*users, -1) {
		usersMap[kv[1]] = turn.GenerateAuthKey(kv[1], *realm, kv[2])
	}

	// 创建 “numThreads” UDP侦听器以传递到 pion/turn
	// pion/turn本身不分配任何UDP套接字，但允许用户传入它们
	// 这允许我们添加日志记录、存储或修改入站/出站流量
	// UDP侦听器共享相同的本地地址：带有设置SO_REUSEPORT的端口和内核
	// 将对每个IP 5元组的接收数据包进行负载平衡
	listenerConfig := &net.ListenConfig{
		Control: func(network, address string, conn syscall.RawConn) error {
			var operr error
			if err = conn.Control(func(fd uintptr) {
				operr = syscall.SetsockoptInt(int(fd), syscall.SOL_SOCKET, unix.SO_REUSEPORT, 1)
			}); err != nil {
				return err
			}

			return operr
		},
	}

	relayAddressGenerator := &turn.RelayAddressGeneratorStatic{
		RelayAddress: net.ParseIP(*publicIP), // 声称监听用户传递的IP
		Address:      "0.0.0.0",              // 但实际上是监听所有网络接口
	}

	packetConnConfigs := make([]turn.PacketConnConfig, *threadNum)
	for i := 0; i < *threadNum; i++ {
		conn, listErr := listenerConfig.ListenPacket(context.Background(), addr.Network(), addr.String())
		if listErr != nil {
			log.Fatalf("Failed to allocate UDP listener at %s:%s", addr.Network(), addr.String())
		}

		packetConnConfigs[i] = turn.PacketConnConfig{
			PacketConn:            conn,
			RelayAddressGenerator: relayAddressGenerator,
		}

		log.Printf("Server %d listening on %s\n", i, conn.LocalAddr().String())
	}

	s, err := turn.NewServer(turn.ServerConfig{
		Realm: *realm,
		// 设置 AuthHandler 回调
		// 用户尝试使用 TURN 服务器进行身份验证时都会调用此操作
		// 返回该用户的密钥，如果找不到用户，则返回false
		AuthHandler: func(username string, realm string, srcAddr net.Addr) ([]byte, bool) { // nolint: revive
			if key, ok := usersMap[username]; ok {
				return key, true
			}
			return nil, false
		},
		// UDP侦听器及配置列表
		PacketConnConfigs: packetConnConfigs,
	})
	if err != nil {
		log.Panicf("Failed to create TURN server: %s", err)
	}

	// Block until user sends SIGINT or SIGTERM
	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	<-sigs

	if err = s.Close(); err != nil {
		log.Panicf("Failed to close TURN server: %s", err)
	}
}
