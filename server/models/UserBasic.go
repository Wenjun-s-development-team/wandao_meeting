package models

import "gorm.io/gorm"

type UserBasic struct {
	gorm.Model
	Name   string `gorm:"column:name;type:varchar(255);uniqueIndex;not null" json:"name"`
	Passwd string `gorm:"column:passwd;type:varchar(255);not null" json:"-"`
	Alias  string `gorm:"column:alias;type:varchar(255);" json:"alias"`
	Sdp    string `gorm:"column:sdp;type:text" json:"sdp"` // 会话描述协议
}

func (table *UserBasic) TableName() string {
	return "user_basic"
}
