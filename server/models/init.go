package models

import (
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var Db *gorm.DB

func InitDb() {
	dsn := "root:123456@tcp(127.0.0.1:3306)/meeting?charset=utf8mb4&parseTime=True&loc=Local"
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		panic(err)
	}
	err = db.AutoMigrate(&RoomBasic{}, &RoomUser{}, &UserBasic{})
	if err != nil {
		panic(err)
	}
	Db = db
}
