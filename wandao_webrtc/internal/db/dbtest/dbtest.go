package dbtest

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"io.wandao.meeting/internal/conf"
	"io.wandao.meeting/internal/utils/dbutil"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

// NewDB 创建测试数据库
func NewDB(t *testing.T, suite string, tables ...any) *gorm.DB {
	dbType := conf.Database.Type

	var dbName string
	var dbOpts conf.DatabaseOpts
	var cleanup func(db *gorm.DB)
	switch dbType {
	case "mysql":
		dbOpts = conf.DatabaseOpts{
			Type:     "mysql",
			Name:     dbName,
			Host:     os.ExpandEnv("$MYSQL_HOST:$MYSQL_PORT"),
			User:     os.Getenv("MYSQL_USER"),
			Password: os.Getenv("MYSQL_PASSWORD"),
		}

		dsn, err := dbutil.NewDSN(dbOpts)
		require.NoError(t, err)

		sqlDB, err := sql.Open("mysql", dsn)
		require.NoError(t, err)

		// Set up test database
		dbName = fmt.Sprintf("test-%s-%d", suite, time.Now().Unix())
		_, err = sqlDB.Exec(fmt.Sprintf("DROP DATABASE IF EXISTS `%s`", dbName))
		require.NoError(t, err)

		_, err = sqlDB.Exec(fmt.Sprintf("CREATE DATABASE `%s`", dbName))
		require.NoError(t, err)

		dbOpts.Name = dbName

		cleanup = func(db *gorm.DB) {
			testDB, err := db.DB()
			if err == nil {
				_ = testDB.Close()
			}

			_, _ = sqlDB.Exec(fmt.Sprintf("DROP DATABASE `%s`", dbName))
			_ = sqlDB.Close()
		}
	case "sqlite":
		dbName = filepath.Join(os.TempDir(), fmt.Sprintf("test-%s-%d.db", suite, time.Now().Unix()))
		dbOpts = conf.DatabaseOpts{
			Type: "sqlite",
			Path: dbName,
		}
		cleanup = func(db *gorm.DB) {
			sqlDB, err := db.DB()
			if err == nil {
				_ = sqlDB.Close()
			}
			_ = os.Remove(dbName)
		}
	default:
		dbName = filepath.Join(os.TempDir(), fmt.Sprintf("test-%s-%d.db", suite, time.Now().Unix()))
		dbOpts = conf.DatabaseOpts{
			Type: "sqlite3",
			Path: dbName,
		}
		cleanup = func(db *gorm.DB) {
			sqlDB, err := db.DB()
			if err == nil {
				_ = sqlDB.Close()
			}
			_ = os.Remove(dbName)
		}
	}

	now := time.Now().UTC().Truncate(time.Second)
	db, err := dbutil.OpenDB(
		dbOpts,
		&gorm.Config{
			SkipDefaultTransaction: true,
			NamingStrategy: schema.NamingStrategy{
				SingularTable: true,
			},
			NowFunc: func() time.Time {
				return now
			},
		},
	)
	require.NoError(t, err)

	t.Cleanup(func() {
		if t.Failed() {
			t.Logf("Database %q left intact for inspection", dbName)
			return
		}

		cleanup(db)
	})

	err = db.Migrator().AutoMigrate(tables...)
	require.NoError(t, err)

	return db
}
