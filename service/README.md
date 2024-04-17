## 安装 turnserver

- https://github.com/coturn/coturn
  ```sh
  ./configure --prefix=/opt/coturn
  make && make install
  ```

## 生成证书

```sh
openssl req -x509 -newkey rsa:2048 -keyout /opt/coturn/ssl/turn_server_pkey.pem -out /opt/coturn/ssl/turn_server_cert.pem -days 99999 -nodes
```

## 配置

- /opt/coturn/etc/turnserver.conf

```sh
syslog
fingerprint
lt-cred-mech
no-stdout-log

listening-port=3478
tls-listening-port=5349
realm=47.116.117.67
server-name=47.116.117.67

user=admin:admin

cert=/opt/coturn/ssl/turn_server_cert.pem
pkey=/opt/coturn/ssl/turn_server_pkey.pem
cipher-list="ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384"
```

## 启动与检测

```sh
turnserver -a -o -c /opt/coturn/etc/turnserver.conf
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
ExecStart=/opt/coturn/bin/turnserver --daemon --pidfile /var/run/turnserver.pid -c /opt/coturn/etc/turnserver.conf
ExecStopPost=/usr/bin/rm -f /var/run/turnserver.pid
Restart=on-abort

[Install]
WantedBy=multi-user.target

LimitCORE=infinity
LimitNOFILE=999999
LimitNPROC=60000
LimitRTPRIO=infinity
LimitRTTIME=7000000
CPUSchedulingPolicy=other
```

## 使服务自动启动

```sh
systemctl enable turnserver.service
# 启动服务
systemctl start turnserver
# 停止服务
systemctl stop turnserver
```
