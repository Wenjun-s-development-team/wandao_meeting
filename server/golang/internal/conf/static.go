package conf

import (
	"net/url"
	"os"
	"wdmeeting/internal/avatar"
)

var (
	BuildTime   string
	BuildCommit string
)

type AppOpts struct {
	Version string `ini:"-"`

	BrandName string
	RunUser   string
	RunMode   string
}

// App 设置
var App AppOpts

type ServerOpts struct {
	ExternalURL string `ini:"EXTERNAL_URL"`

	Domain               string
	Protocol             string
	HTTPAddr             string `ini:"HTTP_ADDR"`
	HTTPPort             string `ini:"HTTP_PORT"`
	CertFile             string
	KeyFile              string
	TLSMinVersion        string `ini:"TLS_MIN_VERSION"`
	UnixSocketPermission string

	OfflineMode      bool
	DisableRouterLog bool

	AppDataPath        string
	LoadAssetsFromDisk bool

	URL            *url.URL    `ini:"-"`
	Subpath        string      `ini:"-"`
	SubpathDepth   int         `ini:"-"`
	UnixSocketMode os.FileMode `ini:"-"`
}

// Server 配置
var Server ServerOpts

type DatabaseOpts struct {
	Type         string
	Host         string
	Name         string
	Schema       string
	User         string
	Password     string
	SSLMode      string `ini:"SSL_MODE"`
	Path         string
	MaxOpenConns int
	MaxIdleConns int
}

// Database 设置
var Database DatabaseOpts

// 数据库类型
var (
	UseMySQL   bool
	UseSQLite3 bool
)

type AuthOpts struct {
	SecretKey string
}

// Auth 身份验证设置
var Auth AuthOpts

type AvatarOpts struct {
	AvatarUploadPath           string
	RepositoryAvatarUploadPath string
	GravatarSource             string
	DisableGravatar            bool
	EnableFederatedAvatar      bool

	LibravatarService *avatar.Libravatar `ini:"-"`
}

// Avatar 图片设置
var Avatar AvatarOpts

var (
	Security struct {
		SecretKey string
	}

	// Cache settings
	Cache struct {
		Adapter  string
		Interval int
		Host     string
	}

	// HTTP settings
	HTTP struct {
		AccessControlAllowOrigin string
	}

	// Attachment 附件设置
	Attachment struct {
		Enabled      bool
		Path         string
		AllowedTypes []string `delim:"|"`
		MaxSize      int64
		MaxFiles     int
	}
)
