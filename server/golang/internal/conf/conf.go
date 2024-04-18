package conf

import (
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"wdmeeting/internal/utils/osutil"

	"github.com/pkg/errors"
	"gopkg.in/ini.v1"
	log "unknwon.dev/clog/v2"

	"wdmeeting/conf"
	"wdmeeting/internal/avatar"
)

func init() {
	err := log.NewConsole()
	if err != nil {
		panic("init console logger: " + err.Error())
	}
}

// File ini配置文件对象
var File *ini.File

// Init 从 ini配置文件 初始化配置.
// NOTE: 加载配置顺序很重要，因为一个配置可能取决于另一个配置.
// ⚠️ WARNING: 请勿在此功能中打印除警告以外的任何内容.
func Init() error {
	data, err := conf.Files.ReadFile("app.ini")
	if err != nil {
		return errors.Wrap(err, `read default "app.ini"`)
	}

	File, err = ini.LoadSources(ini.LoadOptions{
		IgnoreInlineComment: true,
	}, data)
	if err != nil {
		return errors.Wrap(err, `parse "app.ini"`)
	}
	File.NameMapper = ini.SnackCase

	iniConf := filepath.Join("conf", "app.ini")

	if osutil.IsFile(iniConf) {
		if err = File.Append(iniConf); err != nil {
			return errors.Wrapf(err, "append %q", iniConf)
		}
	} else {
		log.Warn("config %q not found.", iniConf)
	}

	if err = File.Section(ini.DefaultSection).MapTo(&App); err != nil {
		return errors.Wrap(err, "mapping default section")
	}

	// ***************************
	// ----- 服务设置 -----
	// ***************************

	if err = File.Section("server").MapTo(&Server); err != nil {
		return errors.Wrap(err, "mapping [server] section")
	}
	Server.AppDataPath = ensureAbs(Server.AppDataPath)

	if !strings.HasSuffix(Server.ExternalURL, "/") {
		Server.ExternalURL += "/"
	}
	Server.URL, err = url.Parse(Server.ExternalURL)
	if err != nil {
		return errors.Wrapf(err, "parse '[server] EXTERNAL_URL' %q", err)
	}

	// 子路径应以 / 开头, 不以 / 结尾, i.e. '/{subpath}'.
	Server.Subpath = strings.TrimRight(Server.URL.Path, "/")
	Server.SubpathDepth = strings.Count(Server.Subpath, "/")

	unixSocketMode, err := strconv.ParseUint(Server.UnixSocketPermission, 8, 32)
	if err != nil {
		return errors.Wrapf(err, "parse '[server] UNIX_SOCKET_PERMISSION' %q", Server.UnixSocketPermission)
	}
	if unixSocketMode > 0777 {
		unixSocketMode = 0666
	}
	Server.UnixSocketMode = os.FileMode(unixSocketMode)

	// *****************************
	// ----- 数据库设置 -----
	// *****************************

	if err = File.Section("database").MapTo(&Database); err != nil {
		return errors.Wrap(err, "mapping [database] section")
	}
	Database.Path = ensureAbs(Database.Path)

	// ****************************
	// ----- Avatar设置 -----
	// ****************************

	if err = File.Section("avatar").MapTo(&Avatar); err != nil {
		return errors.Wrap(err, "mapping [avatar] section")
	}
	Avatar.AvatarUploadPath = ensureAbs(Avatar.AvatarUploadPath)
	Avatar.RepositoryAvatarUploadPath = ensureAbs(Avatar.RepositoryAvatarUploadPath)

	switch Avatar.GravatarSource {
	case "gravatar":
		Avatar.GravatarSource = "https://secure.gravatar.com/avatar/"
	case "libravatar":
		Avatar.GravatarSource = "https://seccdn.libravatar.org/avatar/"
	}

	if Server.OfflineMode {
		Avatar.DisableGravatar = true
		Avatar.EnableFederatedAvatar = false
	}
	if Avatar.DisableGravatar {
		Avatar.EnableFederatedAvatar = false
	}
	if Avatar.EnableFederatedAvatar {
		gravatarURL, err := url.Parse(Avatar.GravatarSource)
		if err != nil {
			return errors.Wrapf(err, "parse Gravatar source %q", Avatar.GravatarSource)
		}

		Avatar.LibravatarService = avatar.NewLibravatar()
		if gravatarURL.Scheme == "https" {
			Avatar.LibravatarService.SetUseHTTPS(true)
			Avatar.LibravatarService.SetSecureFallbackHost(gravatarURL.Host)
		} else {
			Avatar.LibravatarService.SetUseHTTPS(false)
			Avatar.LibravatarService.SetFallbackHost(gravatarURL.Host)
		}
	}

	if err = File.Section("cache").MapTo(&Cache); err != nil {
		return errors.Wrap(err, "mapping [cache] section")
	} else if err = File.Section("http").MapTo(&HTTP); err != nil {
		return errors.Wrap(err, "mapping [http] section")
	}

	return nil
}

func MustInit() {
	err := Init()
	if err != nil {
		panic(err)
	}
}
