package db

import (
	"flag"
	"fmt"
	"os"
	"testing"

	"io.wandao.meeting/internal/conf"
	"io.wandao.meeting/internal/utils/testutil"

	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	_ "modernc.org/sqlite"
	log "unknwon.dev/clog/v2"
)

func TestMain(m *testing.M) {
	flag.Parse()

	level := logger.Silent
	if !testing.Verbose() {
		log.Remove(log.DefaultConsoleName)
		err := log.New("noop", testutil.InitNoopLogger)
		if err != nil {
			fmt.Println(err)
			os.Exit(1)
		}
	} else {
		level = logger.Info
	}

	logger.Default = logger.Default.LogMode(level)

	switch conf.Database.Type {
	case "mysql":
		conf.UseMySQL = true
	default:
		conf.UseSQLite3 = true
	}

	os.Exit(m.Run())
}

// clearTables 清空表
func clearTables(t *testing.T, db *gorm.DB, tables ...any) error {
	if t.Failed() {
		return nil
	}

	for _, t := range tables {
		err := db.Where("TRUE").Delete(t).Error
		if err != nil {
			return err
		}
	}
	return nil
}
