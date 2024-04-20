package userutil

import (
	"bytes"
	"crypto/sha256"
	"crypto/subtle"
	"fmt"
	"image"
	"image/png"
	"os"
	"path/filepath"
	"strconv"
	"wdmeeting/internal/conf"
  "wdmeeting/internal/utils/avatarutil"
	"wdmeeting/internal/utils/strutil"

	"github.com/nfnt/resize"
	"github.com/pkg/errors"
	"golang.org/x/crypto/pbkdf2"
)

// CustomAvatarPath 获取用户头像地址
func CustomAvatarPath(userId int64) string {
	return filepath.Join(conf.Avatar.AvatarUploadPath, strconv.FormatInt(userId, 10))
}

// GenerateRandomAvatar 随机生成头像
func GenerateRandomAvatar(userId int64, name, email string) error {
	seed := email
	if seed == "" {
		seed = name
	}

	img, err := avatarutil.RandomImage([]byte(seed))
	if err != nil {
		return errors.Wrap(err, "generate random image")
	}

	avatarPath := CustomAvatarPath(userId)
	err = os.MkdirAll(filepath.Dir(avatarPath), os.ModePerm)
	if err != nil {
		return errors.Wrap(err, "create avatarutil directory")
	}

	f, err := os.Create(avatarPath)
	if err != nil {
		return errors.Wrap(err, "create avatarutil file")
	}
	defer func() { _ = f.Close() }()

	if err = png.Encode(f, img); err != nil {
		return errors.Wrap(err, "encode avatarutil image to file")
	}
	return nil
}

// SaveAvatar 保存头像
func SaveAvatar(userId int64, data []byte) error {
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return errors.Wrap(err, "decode image")
	}

	avatarPath := CustomAvatarPath(userId)
	err = os.MkdirAll(filepath.Dir(avatarPath), os.ModePerm)
	if err != nil {
		return errors.Wrap(err, "create avatarutil directory")
	}

	f, err := os.Create(avatarPath)
	if err != nil {
		return errors.Wrap(err, "create avatarutil file")
	}
	defer func() { _ = f.Close() }()

	m := resize.Resize(avatarutil.DefaultSize, avatarutil.DefaultSize, img, resize.NearestNeighbor)
	if err = png.Encode(f, m); err != nil {
		return errors.Wrap(err, "encode avatarutil image to file")
	}
	return nil
}

// EncodePassword 对密码进行编码
func EncodePassword(password, salt string) string {
	newPasswd := pbkdf2.Key([]byte(password), []byte(salt), 10000, 50, sha256.New)
	return fmt.Sprintf("%x", newPasswd)
}

// ValidatePassword 验证用户密码
func ValidatePassword(encoded, salt, password string) bool {
	got := EncodePassword(password, salt)
	return subtle.ConstantTimeCompare([]byte(encoded), []byte(got)) == 1
}

// RandomSalt 随机生成的10个字符用于 salt
func RandomSalt() (string, error) {
	return strutil.RandomChars(10)
}
