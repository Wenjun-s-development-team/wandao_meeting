# 使用官方的golang作为基础镜像
FROM golang:alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制源码到容器的/app
COPY . .

# 设置环境、构建项目
RUN go env -w GO111MODULE=on \
    && go env -w GOPROXY=https://goproxy.cn,direct \
    && go env -w CGO_ENABLED=0 \
    && go env \
    && go mod tidy \
    && go build -o wdmeeting .

# 使用Alpine Linux作为基础镜像
FROM alpine:latest

# 设置工作目录
WORKDIR /root/

# 从builder阶段复制构建好的应用
COPY --from=builder /app/wdmeeting .

# 安装 ca-certificates 以便能够使用 HTTPS
# RUN apk add --no-cache ca-certificates

LABEL MAINTAINER="elkon@qq.com"

# 暴露端口
EXPOSE 8080

# 设置默认启动的命令
CMD ["./wdmeeting"]

# 构建镜像
# docker build -t wdmeeting .
# 创建容器
# docker run -p 8080:8080 wdmeeting