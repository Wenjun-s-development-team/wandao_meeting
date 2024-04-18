package dbutil

import (
	"fmt"
	"strings"
	"wdmeeting/internal/conf"

	"github.com/pkg/errors"
	"gorm.io/driver/mysql"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// NewDSN 创建DNS
func NewDSN(opts conf.DatabaseOpts) (dsn string, err error) {
	// 如果数据库名称包含 ？
	concate := "?"
	if strings.Contains(opts.Name, concate) {
		concate = "&"
	}

	switch opts.Type {
	case "mysql":
		if opts.Host[0] == '/' { // Looks like a unix socket
			dsn = fmt.Sprintf("%s:%s@unix(%s)/%s%scharset=utf8mb4&parseTime=true",
				opts.User, opts.Password, opts.Host, opts.Name, concate)
		} else {
			dsn = fmt.Sprintf("%s:%s@tcp(%s)/%s%scharset=utf8mb4&parseTime=true",
				opts.User, opts.Password, opts.Host, opts.Name, concate)
		}

	case "sqlite3", "sqlite":
		dsn = "file:" + opts.Path + "?cache=shared&mode=rwc"

	default:
		return "", errors.Errorf("unrecognized dialect: %s", opts.Type)
	}

	return dsn, nil
}

// OpenDB 打开数据库连接
func OpenDB(opts conf.DatabaseOpts, cfg *gorm.Config) (*gorm.DB, error) {
	dsn, err := NewDSN(opts)
	if err != nil {
		return nil, errors.Wrap(err, "parse DSN")
	}

	var dialector gorm.Dialector
	switch opts.Type {
	case "mysql":
		dialector = mysql.Open(dsn)
	case "sqlite3":
		dialector = sqlite.Open(dsn)
	case "sqlite":
		dialector = sqlite.Open(dsn)
		dialector.(*sqlite.Dialector).DriverName = "sqlite"
	default:
		panic("unreachable")
	}

	return gorm.Open(dialector, cfg)
}
