#!/bin/sh

PKG_PATH=io.wandao.meeting/internal/conf
BUILD_TIME=`date -u '+%Y-%m-%d %I:%M:%S %Z'`
BUILD_COMMIT=`git rev-parse HEAD`

go build go build -v -ldflags "'-X $PKG_PATH.BuildTime=$BUILD_TIME -X $PKG_PATH.BuildCommit=$BUILD_COMMIT'"
