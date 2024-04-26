package conf

import (
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/pkg/errors"
	"gopkg.in/ini.v1"
	"io.wandao.meeting/conf"
	"io.wandao.meeting/internal/libs/libravatar"
	"io.wandao.meeting/internal/utils/osutil"
	log "unknwon.dev/clog/v2"
)

func init() {
	err := log.NewConsole()
	if err != nil {
		panic("init console logger: " + err.Error())
	}
}

// File ini配置文件对象
var File *ini.File

// Init 从 ini配置文件 初始化配置
func Init() error {
	data, err := conf.Files.ReadFile("app.ini")
	if err != nil {
		return errors.Wrap(err, `read default "app.ini"`)
	}

	File, err = ini.LoadSources(ini.LoadOptions{IgnoreInlineComment: true}, data)

	if err != nil {
		return errors.Wrap(err, `parse "app.ini"`)
	}

	File.NameMapper = ini.SnackCase

	ConfigFile = filepath.Join(ConfigDir(), "user.ini")

	if osutil.IsFile(ConfigFile) {
		// 合并用户配置文件
		if err = File.Append(ConfigFile); err != nil {
			return errors.Wrapf(err, "append %q", ConfigFile)
		}
	} else {
		_ = os.MkdirAll(filepath.Dir(ConfigFile), os.ModePerm)
		if err = File.SaveTo(ConfigFile); err != nil {
			return errors.Wrapf(err, "save to config error: %q", ConfigFile)
		}
		log.Trace("User profile: %q", ConfigFile)
	}

	if err = File.Section(ini.DefaultSection).MapTo(&App); err != nil {
		return errors.Wrap(err, "mapping default section")
	} else if err = File.Section("ice").MapTo(&Ice); err != nil {
		return errors.Wrap(err, "mapping [ice] section")
	} else if err = File.Section("redis").MapTo(&Redis); err != nil {
		return errors.Wrap(err, "mapping [redis] section")
	} else if err = File.Section("database").MapTo(&Database); err != nil {
		return errors.Wrap(err, "mapping [database] section")
	} else if err = File.Section("server").MapTo(&Server); err != nil {
		return errors.Wrap(err, "mapping [server] section")
	} else if err = File.Section("cors").MapTo(&Cors); err != nil {
		return errors.Wrap(err, "mapping [cors] section")
	} else if err = File.Section("security").MapTo(&Security); err != nil {
		return errors.Wrap(err, "mapping [security] section")
	} else if err = File.Section("avatar").MapTo(&Avatar); err != nil {
		return errors.Wrap(err, "mapping [avatar] section")
	} else if err = File.Section("attachment").MapTo(&Attachment); err != nil {
		return errors.Wrap(err, "mapping [attachment] section")
	}

	// ----- Server 设置 -----
	Server.AppDataPath = ensureAbs(Server.AppDataPath)
	if !strings.HasSuffix(Server.ExternalURL, "/") {
		Server.ExternalURL += "/"
	}

	Server.URL, err = url.Parse(Server.ExternalURL)
	if err != nil {
		return errors.Wrapf(err, "parse '[server] EXTERNAL_URL' %q", err)
	}

	// 子路径应以 / 开头, 不以 / 结尾, i.e. conf.Server.Subpath + "/data".
	Server.Subpath = strings.TrimRight(Server.URL.Path, "/")
	Server.SubpathDepth = strings.Count(Server.Subpath, "/")

	// ----- Database 设置 -----
	Database.Path = ensureAbs(Database.Path)

	// ----- Cors 跨域设置 -----
	Cors.MaxAge = Cors.MaxAge * time.Second

	// ----- Avatar 设置 -----
	Avatar.AvatarUploadPath = ensureAbs(Avatar.AvatarUploadPath)
	Avatar.RepositoryAvatarUploadPath = ensureAbs(Avatar.RepositoryAvatarUploadPath)

	switch Avatar.GravatarSource {
	case "gravatar":
		Avatar.GravatarSource = "https://secure.gravatar.com/avatar/"
	case "libravatar":
		Avatar.GravatarSource = "https://seccdn.libravatar.org/avatar/"
	}

	if Avatar.DisableGravatar {
		Avatar.EnableFederatedAvatar = false
	}

	if Avatar.EnableFederatedAvatar {
		gravatarURL, err := url.Parse(Avatar.GravatarSource)
		if err != nil {
			return errors.Wrapf(err, "parse Gravatar source %q", Avatar.GravatarSource)
		}

		Avatar.LibravatarService = libravatar.NewLibravatar()
		if gravatarURL.Scheme == "https" {
			Avatar.LibravatarService.SetUseHTTPS(true)
			Avatar.LibravatarService.SetSecureFallbackHost(gravatarURL.Host)
		} else {
			Avatar.LibravatarService.SetUseHTTPS(false)
			Avatar.LibravatarService.SetFallbackHost(gravatarURL.Host)
		}
	}

	return nil
}
