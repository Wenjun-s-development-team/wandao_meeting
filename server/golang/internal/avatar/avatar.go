package avatar

import (
	"fmt"
	"github.com/issue9/identicon"
	"image"
	"image/color/palette"
	"math/rand"
	"time"
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
