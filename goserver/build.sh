#!/bin/sh

PKG_PATH="io.wandao.meeting/internal/conf"
BUILD_TIME=`date -u '+%Y-%m-%d %I:%M:%S %Z'`
BUILD_COMMIT=`git rev-parse HEAD`


export CGO_ENABLED=1
# linux amd64
export CC="x86_64-linux-musl-gcc"
export CXX="x86_64-linux-musl-g++"
export GOOS=linux
export GOARCH=amd64

# darwin arm64
#export GOOS=darwin
#export GOARCH=arm64
#export CGO_LDFLAGS="\"-X '$PKG_PATH.BuildTime=$BUILD_TIME' -X '$PKG_PATH.BuildCommit=$BUILD_COMMIT'\""

go build -v -trimpath -o wdmeeting
