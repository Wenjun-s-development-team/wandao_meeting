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
listening-port=3478
tls-listening-port=5349
fingerprint
lt-cred-mech
server-name=turn.idreamsky.net
user=dreamsky:ilovewandao
realm=turn.idreamsky.net
cert=/etc/letsencrypt/live/turn.idreamsky.net/fullchain.pem
pkey=/etc/letsencrypt/live/turn.idreamsky.net/privkey.pem
cipher-list="ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384"
no-stdout-log
syslog
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
