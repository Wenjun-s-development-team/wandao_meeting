#!/bin/sh

PKG_PATH=wdmeeting/internal/conf
BUILD_TIME=`date -u '+%Y-%m-%d %I:%M:%S %Z'`
BUILD_COMMIT=`git rev-parse HEAD`

# TODO input
BINARY_EXT=

echo "请输入 -tags 值:"
read TAGS

echo "请输入扩展名:"
read BINARY_EXT

go build go build -v -ldflags \
  "'-X $PKG_PATH.BuildTime=$BUILD_TIME -X $PKG_PATH.BuildCommit=$BUILD_COMMIT'" \
  -tags $TAGS -trimpath -o wdmeeting$BINARY_EXT
