## 安装 turnserver

- https://github.com/coturn/coturn
  ```sh
  apt install coturn
  # or
  docker run -d -p 3478:3478 -p 3478:3478/udp -p 5349:5349 -p 5349:5349/udp -p 49152-65535:49152-65535/udp coturn/coturn
  ```

## 生成证书

```sh
openssl req -x509 -newkey rsa:2048 -keyout /usr/local/etc/turn_server_pkey.pem -out /usr/local/etc/turn_server_cert.pem -days 99999 -nodes
```

## 配置

- /etc/turnserver.conf

```sh
# 必须设置 cli-password
cli-password=123456
# 内网IP
listening-ip=xxx
# 外网IP
listening-ip=xxx
 # 外网IP
relay-ip=xxx
 # 外网IP
external-ip=xxx
# 外网IP
realm=xxx
# 在TURN信息中使用指纹
# fingerprint
# 长时验证
lt-cred-mech
# 服务名称 可以是IP
server-name=xxx
# 简单的添加 用户:密码
user=admin:admin

# 证书
cert=/usr/local/etc/turn_server_cert.pem
pkey=/usr/local/etc/turn_server_pkey.pem
# 开启系统日志
syslog
 # 开启移动端支持
mobility
```

## 启动与检测

```sh
turnserver -a -o -c /etc/turnserver.conf
```

## 添加服务

- /etc/systemd/system/turnserver.service

```txt
[Unit]
Description=coturn
Documentation=man:coturn(1) man:turnadmin(1) man:turnserver(1)
After=syslog.target network.target

[Service]
Type=forking
PIDFile=/var/run/turnserver.pid
ExecStart=/usr/bin/turnserver --daemon --pidfile /var/run/turnserver.pid -c /etc/turnserver.conf
ExecStopPost=/usr/bin/rm -f /var/run/turnserver.pid
Restart=on-abort

LimitCORE=infinity
LimitNOFILE=999999
LimitNPROC=60000
LimitRTPRIO=infinity
LimitRTTIME=7000000
CPUSchedulingPolicy=other
```

## 使服务自动启动

```sh
sudo systemctl enable turnserver.service
# 启动服务
sudo systemctl start turnserver
# 停止服务
sudo systemctl stop turnserver
```
