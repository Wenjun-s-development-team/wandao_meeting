// Copyright 2014 The Gogs Authors. All rights reserved.
// Use of this source code is governed by a MIT-style
// license that can be found in the LICENSE file.

package db

import (
	"database/sql"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"io.wandao.meeting/internal/conf"

	"github.com/pkg/errors"
	"xorm.io/core"
	"xorm.io/xorm"
	xlog "xorm.io/xorm/log"

	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	log "unknwon.dev/clog/v2"
)

type Version struct {
	ID      int64
	Version int64
}

// Engine represents a XORM engine or session.
type Engine interface {
	Delete(any) (int64, error)
	Exec(...any) (sql.Result, error)
	Find(any, ...any) error
	Get(any) (bool, error)
	ID(any) *xorm.Session
	In(string, ...any) *xorm.Session
	Insert(...any) (int64, error)
	InsertOne(any) (int64, error)
	Iterate(any, xorm.IterFunc) error
	Sql(string, ...any) *xorm.Session
	Table(any) *xorm.Session
	Where(any, ...any) *xorm.Session
}

var (
	x            *xorm.Engine
	legacyTables []any
	HasEngine    bool
)

func init() {
	legacyTables = append(legacyTables,
		new(User),
	)

	gonicNames := []string{"SSL"}
	for _, name := range gonicNames {
		core.LintGonicMapper[name] = true
	}
}

func getEngine() (*xorm.Engine, error) {
	Param := "?"
	if strings.Contains(conf.Database.Name, Param) {
		Param = "&"
	}

	driver := conf.Database.Type
	connStr := ""
	switch conf.Database.Type {
	case "mysql":
		conf.UseMySQL = true
		if conf.Database.Host[0] == '/' { // looks like a unix socket
			connStr = fmt.Sprintf("%s:%s@unix(%s)/%s%scharset=utf8mb4&parseTime=true",
				conf.Database.User, conf.Database.Password, conf.Database.Host, conf.Database.Name, Param)
		} else {
			connStr = fmt.Sprintf("%s:%s@tcp(%s)/%s%scharset=utf8mb4&parseTime=true",
				conf.Database.User, conf.Database.Password, conf.Database.Host, conf.Database.Name, Param)
		}
		engineParams := map[string]string{"rowFormat": "DYNAMIC"}
		return xorm.NewEngineWithParams(conf.Database.Type, connStr, engineParams)

	case "sqlite3":
		if err := os.MkdirAll(path.Dir(conf.Database.Path), os.ModePerm); err != nil {
			return nil, fmt.Errorf("create directories: %v", err)
		}
		conf.UseSQLite3 = true
		connStr = "file:" + conf.Database.Path + "?cache=shared&mode=rwc"

	default:
		return nil, fmt.Errorf("unknown database type: %s", conf.Database.Type)
	}
	return xorm.NewEngine(driver, connStr)
}

func NewTestEngine() error {
	x, err := getEngine()
	if err != nil {
		return fmt.Errorf("connect to database: %v", err)
	}

	x.SetMapper(core.GonicMapper{})
	return x.StoreEngine("InnoDB").Sync2(legacyTables...)
}

func Ping() error {
	if x == nil {
		return errors.New("database not available")
	}
	return x.Ping()
}

func InitDatabaseEngine() (*gorm.DB, error) {
	var err error
	x, err = getEngine()
	if err != nil {
		return nil, fmt.Errorf("connect to database: %v", err)
	}

	x.SetMapper(core.GonicMapper{})

	logPath := filepath.Join(conf.Log.RootPath, "xorm.log")
	sec := conf.File.Section("log.xorm")
	fileWriter, err := log.NewFileWriter(logPath,
		log.FileRotationConfig{
			Rotate:  sec.Key("ROTATE").MustBool(true),
			Daily:   sec.Key("ROTATE_DAILY").MustBool(true),
			MaxSize: sec.Key("MAX_SIZE").MustInt64(100) * 1024 * 1024,
			MaxDays: sec.Key("MAX_DAYS").MustInt64(3),
		},
	)
	if err != nil {
		return nil, fmt.Errorf("create 'xorm.log': %v", err)
	}

	x.SetMaxOpenConns(conf.Database.MaxOpenConns)
	x.SetMaxIdleConns(conf.Database.MaxIdleConns)
	x.SetConnMaxLifetime(time.Second)

	if conf.IsProdMode() {
		x.SetLogger(xlog.NewSimpleLogger3(fileWriter, xlog.DEFAULT_LOG_PREFIX, xlog.DEFAULT_LOG_FLAG, xlog.DEFAULT_LOG_LEVEL))
	} else {
		x.SetLogger(xlog.NewSimpleLogger(fileWriter))
	}
	x.ShowSQL(true)

	var gormLogger logger.Writer

	gormLogger, err = newLogWriter()
	if err != nil {
		return nil, errors.Wrap(err, "new log writer")
	}

	return InitDatabase(gormLogger)
}
