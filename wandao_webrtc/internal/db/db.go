package db

import (
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"io.wandao.meeting/internal/conf"
	"io.wandao.meeting/internal/utils/dbutil"

	"github.com/pkg/errors"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/schema"

	log "unknwon.dev/clog/v2"
)

func newLogWriter() (logger.Writer, error) {
	sec := conf.File.Section("log.gorm")
	w, err := log.NewFileWriter(
		filepath.Join(conf.Log.RootPath, "gorm.log"),
		log.FileRotationConfig{
			Rotate:  sec.Key("ROTATE").MustBool(true),
			Daily:   sec.Key("ROTATE_DAILY").MustBool(true),
			MaxSize: sec.Key("MAX_SIZE").MustInt64(100) * 1024 * 1024,
			MaxDays: sec.Key("MAX_DAYS").MustInt64(3),
		},
	)
	if err != nil {
		return nil, errors.Wrap(err, `create "gorm.log"`)
	}
	return &dbutil.Logger{Writer: w}, nil
}

// Tables 表列表
// NOTE: 行按字母顺序排序，每个字母都在自己的行中.
var Tables = []any{
	new(Room),
	new(User),
}

func InitDatabase(w logger.Writer) (*gorm.DB, error) {
	level := logger.Info
	if conf.IsProdMode() {
		level = logger.Warn
	}
	// 设置 gorm 日志
	logger.Default = logger.New(w, logger.Config{
		SlowThreshold: 100 * time.Millisecond,
		LogLevel:      level,
	})

	db, err := dbutil.OpenDB(
		conf.Database,
		&gorm.Config{
			SkipDefaultTransaction: true,
			NamingStrategy: schema.NamingStrategy{
				SingularTable: true,
			},
			NowFunc: func() time.Time {
				return time.Now().UTC().Truncate(time.Microsecond)
			},
		},
	)
	if err != nil {
		return nil, errors.Wrap(err, "open database")
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, errors.Wrap(err, "get underlying *sql.DB")
	}
	sqlDB.SetMaxOpenConns(conf.Database.MaxOpenConns)
	sqlDB.SetMaxIdleConns(conf.Database.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(time.Minute)

	switch conf.Database.Type {
	case "mysql":
		conf.UseMySQL = true
		db = db.Set("gorm:table_options", "ENGINE=InnoDB").Session(&gorm.Session{})
	case "sqlite3":
		conf.UseSQLite3 = true
	default:
		panic("unreachable")
	}

	for _, table := range Tables {
		if db.Migrator().HasTable(table) {
			continue
		}

		name := strings.TrimPrefix(fmt.Sprintf("%T", table), "*db.")
		err = db.Migrator().AutoMigrate(table)
		if err != nil {
			return nil, errors.Wrapf(err, "auto migrate %q", name)
		}
		log.Trace("Auto migrated %q", name)
	}

	Users = useUsersStore(db)
	Rooms = useRoomsStore(db)

	return db, nil
}
