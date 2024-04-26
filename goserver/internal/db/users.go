package db

import (
	"context"
	"strings"
	"time"

	"io.wandao.meeting/internal/utils/cryptoutil"
	"io.wandao.meeting/internal/utils/userutil"

	"github.com/pkg/errors"
	"gorm.io/gorm"
)

// User 用户表结构体
type User struct {
	Id     uint64 `gorm:"primarykey" json:"id"`
	Name   string `xorm:"UNIQUE NOT NULL" gorm:"unique;not null" json:"name"`
	Passwd string `xorm:"passwd NOT NULL" gorm:"column:passwd;not null" json:"-"`
	Alias  string `xorm:"VARCHAR(255)" gorm:"type:varchar(255);" json:"alias"`
	Email  string `xorm:"NOT NULL" gorm:"not null" json:"email"`
	Avatar string `xorm:"VARCHAR(2048)" gorm:"type:VARCHAR(2048);" json:"avatar"`
	Salt   string `xorm:"VARCHAR(10)" gorm:"type:VARCHAR(10)" json:"-"`

	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

type UserInput struct {
	Name   string
	Passwd string
	Alias  string
	Email  string
	Avatar string
	Salt   string
}

type UsersStore interface {
	Login(ctx context.Context, name string, passwd string) (*User, error)
	Save(ctx context.Context, user *User) error
	Create(ctx context.Context, user *User) (*User, error)
	GetByID(ctx context.Context, id uint64) (*User, error)
	GetByName(ctx context.Context, name string) (*User, error)
	DeleteByID(ctx context.Context, userId uint64) error
	DeleteByName(ctx context.Context, name string) error
}

type users struct {
	*gorm.DB
}

var Users UsersStore
var _ UsersStore = (*users)(nil)

func (db *users) Login(ctx context.Context, name string, passwd string) (*User, error) {
	name = strings.ToLower(name)

	query := db.WithContext(ctx)
	if strings.Contains(name, "@") {
		query = query.Where("email = ?", name)
	} else {
		query = query.Where("name = ?", name)
	}

	user := new(User)
	err := query.First(user).Error
	if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, errors.New("用户不存在")
	}

	// 如果找到了
	if err == nil {
		// 验证密码
		if userutil.ValidatePassword(user.Passwd, user.Salt, passwd) {
			return user, nil
		} else {
			return nil, errors.New("账号或密码错误")
		}
	}

	return nil, err
}

func (db *users) Save(ctx context.Context, user *User) error {
	if len(user.Email) > 0 {
		user.Avatar = cryptoutil.MD5(user.Email)
	}

	if len(user.Passwd) > 0 {
		salt, err := userutil.RandomSalt()
		if err != nil {
			return err
		}
		user.Salt = salt
		user.Passwd = userutil.EncodePassword(user.Passwd, user.Salt)
	}

	err := db.WithContext(ctx).FirstOrCreate(&user, "name = ?", user.Name).Error
	if err != nil {
		return err
	}
	return nil
}

func (db *users) Create(ctx context.Context, user *User) (*User, error) {
	if len(user.Email) > 0 {
		user.Avatar = cryptoutil.MD5(user.Email)
	}

	salt, err := userutil.RandomSalt()
	if err != nil {
		return nil, err
	}

	user.Salt = salt
	user.Passwd = userutil.EncodePassword(user.Passwd, user.Salt)

	return user, db.WithContext(ctx).Create(&user).Error
}

func (db *users) GetByID(ctx context.Context, userId uint64) (*User, error) {
	user := new(User)
	err := db.WithContext(ctx).Where("id = ?", userId).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.Wrapf(err, "用户不存在(%d)", userId)
		}
		return nil, err
	}
	return user, nil
}

func (db *users) GetByName(ctx context.Context, name string) (*User, error) {
	user := new(User)
	err := db.WithContext(ctx).Where("name = ?", name).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.Wrapf(err, "用户不存在(%s)", name)
		}
		return nil, err
	}
	return user, nil
}

func (db *users) DeleteByID(ctx context.Context, userId uint64) error {
	var user User
	return db.WithContext(ctx).Unscoped().Where("id=?", userId).Delete(&user).Error
}

func (db *users) DeleteByName(ctx context.Context, name string) error {
	var user User
	return db.WithContext(ctx).Unscoped().Where("name=?", name).Delete(&user).Error
}

func useUsersStore(db *gorm.DB) UsersStore {
	return &users{DB: db}
}
