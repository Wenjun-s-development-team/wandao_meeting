package avatarutil

import (
	"fmt"
	"github.com/issue9/identicon"
	"github.com/unknwon/com"
	"image"
	"image/color/palette"
	"math/rand"
	"strings"
	"time"
	"wdmeeting/internal/conf"
	"wdmeeting/internal/utils/tool"

	log "unknwon.dev/clog/v2"
)

const DefaultSize = 290

// RandomImageWithSize 按指定大小 生成随机头像
func RandomImageWithSize(size int, data []byte) (image.Image, error) {
	randExtent := len(palette.WebSafe) - 32
	rand.Seed(time.Now().UnixNano())
	colorIndex := rand.Intn(randExtent)
	backColorIndex := colorIndex - 1
	if backColorIndex < 0 {
		backColorIndex = randExtent - 1
	}

	// 定义大小、背景和前景
	imgMaker, err := identicon.New(size,
		palette.WebSafe[backColorIndex], palette.WebSafe[colorIndex:colorIndex+32]...)
	if err != nil {
		return nil, fmt.Errorf("identicon.New: %v", err)
	}
	return imgMaker.Make(data), nil
}

// RandomImage 按默认大小 生成随机头像
func RandomImage(data []byte) (image.Image, error) {
	return RandomImageWithSize(DefaultSize, data)
}

// AvatarLink 通过邮箱获取头像地址
func AvatarLink(email string) (url string) {
	if conf.Avatar.EnableFederatedAvatar && conf.Avatar.LibravatarService != nil &&
		strings.Contains(email, "@") {
		var err error
		url, err = conf.Avatar.LibravatarService.FromEmail(email)
		if err != nil {
			log.Warn("AvatarLink.LibravatarService.FromEmail [%s]: %v", email, err)
		}
	}
	if url == "" && !conf.Avatar.DisableGravatar {
		url = conf.Avatar.GravatarSource + tool.HashEmail(email) + "?d=identicon"
	}
	if url == "" {
		url = conf.Server.Subpath + "/img/avatar_default.png"
	}
	return url
}

// SetAvatarSize 设置头像大小
func SetAvatarSize(url string, size int) string {
	if strings.Contains(url, "?") {
		return url + "&s=" + com.ToStr(size)
	}
	return url + "?s=" + com.ToStr(size)
}
