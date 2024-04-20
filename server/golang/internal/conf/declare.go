package conf

import (
	"net/url"
	"time"
	"wdmeeting/internal/libs/libravatar"
)

type AppOpts struct {
	Version string `ini:"-"`

	BrandName string
	RunUser   string
	RunMode   string
}

type ServerOpts struct {
	Domain      string
	Protocol    string
	HTTPAddr    string `ini:"HTTP_ADDR"`
	HTTPPort    string `ini:"HTTP_PORT"`
	ExternalURL string `ini:"EXTERNAL_URL"`

	CertFile string
	KeyFile  string

	DisableRouterLog bool

	AppDataPath string

	URL          *url.URL `ini:"-"`
	Subpath      string   `ini:"-"`
	SubpathDepth int      `ini:"-"`
}

type DatabaseOpts struct {
	Type         string
	Host         string
	Name         string
	Schema       string
	User         string
	Password     string
	Path         string
	MaxOpenConns int
	MaxIdleConns int
}

type AvatarOpts struct {
	AvatarUploadPath           string
	RepositoryAvatarUploadPath string
	GravatarSource             string
	DisableGravatar            bool
	EnableFederatedAvatar      bool

	LibravatarService *libravatar.Libravatar `ini:"-"`
}

// CorsOpts 跨域设置
type CorsOpts struct {
	AllowDomain      []string `delim:","`
	AllowMethods     []string `delim:","`
	AllowSubdomain   bool
	AllowCredentials bool
	MaxAge           time.Duration
}

// SecurityOpts 安全设置
type SecurityOpts struct {
	SecretKey string
}

// AttachmentOpts 附件设置
type AttachmentOpts struct {
	Enabled      bool
	Path         string
	AllowedTypes []string `delim:"|"`
	MaxSize      int64
	MaxFiles     int
}

var (
	BuildTime   string
	BuildCommit string

	App AppOpts

	UseMySQL   bool
	UseSQLite3 bool

	Database DatabaseOpts
	Server   ServerOpts
	Cors     CorsOpts
	Security SecurityOpts

	Avatar     AvatarOpts
	Attachment AttachmentOpts

	// ConfigFile app.ini 配置文件路径
	ConfigFile string
)
