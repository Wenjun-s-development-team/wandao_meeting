package conf

import (
	"io.wandao.meeting/internal/libs/libravatar"
	"net/url"
	"time"
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
	SocketPort  string `ini:"SOCKET_PORT"`
	RPCPort     string `ini:"RPC_PORT"`
	ExternalURL string `ini:"EXTERNAL_URL"`

	CertFile string
	KeyFile  string

	DisableRouterLog bool

	AppDataPath string

	URL          *url.URL `ini:"-"`
	Subpath      string   `ini:"-"`
	SubpathDepth int      `ini:"-"`
}

type IceOpts struct {
	StunUrls    string `ini:"STUN_URLS"`
	StunEnabled bool   `ini:"STUN_ENABLED"`

	TurnUrls       string `ini:"TURN_URLS"`
	TurnEnabled    bool   `ini:"TURN_ENABLED"`
	TurnUsername   string `ini:"TURN_USERNAME"`
	TurnCredential string `ini:"TURN_CREDENTIAL"`
}

type RedisOpts struct {
	Addr         string `ini:"ADDR"`
	Password     string `ini:"PASSWORD"`
	DB           int    `ini:"DB"`
	PoolSize     int    `ini:"POOL_SIZE"`
	MinIdleConns int    `ini:"MIN_IDLE_CONNS"`
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
	Scheme           string   `ini:"SCHEME"`
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
	Ice IceOpts

	UseMySQL   bool
	UseSQLite3 bool

	Database DatabaseOpts
	Server   ServerOpts
	Cors     CorsOpts
	Security SecurityOpts
	Redis    RedisOpts

	Avatar     AvatarOpts
	Attachment AttachmentOpts

	// ConfigFile app.ini 配置文件路径
	ConfigFile string
)
