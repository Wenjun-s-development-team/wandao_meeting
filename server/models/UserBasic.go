package models

import "gorm.io/gorm"

type UserBasic struct {
	gorm.Model
	Username string `gorm:"column:username;type:varchar(100);uniqueIndex;not null" json:"username"`
	Password string `gorm:"column:password;type:varchar(36);not null" json:"-"`
	Sdp      string `gorm:"column:sdp;type:text" json:"sdp"` // 会话描述协议
}

func (table *UserBasic) TableName() string {
	return "user_basic"
}
