package db

import (
	"context"
	"io.wandao.meeting/internal/utils/errutil"
	"io.wandao.meeting/internal/utils/userutil"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/pkg/errors"
	"gorm.io/gorm"
)

// User 用户表结构体
type User struct {
	// gorm.Model
	Id     uint64   `gorm:"primaryKey" json:"id"`
	Type   UserType `json:"type"`
	Name   string   `xorm:"UNIQUE NOT NULL" gorm:"unique;not null" json:"name"`
	Passwd string   `xorm:"passwd NOT NULL" gorm:"column:passwd;not null" json:"-"`
	Alias  string   `xorm:"VARCHAR(255)" gorm:"type:varchar(255);" json:"alias"`
	Email  string   `xorm:"NOT NULL" gorm:"not null" json:"email"`
	Avatar string   `xorm:"VARCHAR(2048)" gorm:"type:VARCHAR(2048);" json:"avatar"`
	Salt   string   `xorm:"VARCHAR(10)" gorm:"type:VARCHAR(10)" json:"-"`

	Created     time.Time `xorm:"-" gorm:"-" json:"createdAt"`
	CreatedUnix int64
	Updated     time.Time `xorm:"-" gorm:"-" json:"updatedAt"`
	UpdatedUnix int64

	IsActive bool `json:"isActive"`
	IsAdmin  bool `json:"isAdmin"`
}

type CreateUserOptions struct {
	Name      string
	Passwd    string
	Alias     string
	Email     string
	Avatar    string
	Salt      string
	Activated bool
	Admin     bool
}

type UserType int

const (
	UserTypeIndividual UserType = iota
)

var (
	reservedUsernames = map[string]struct{}{
		"-":          {},
		"explore":    {},
		"create":     {},
		"assets":     {},
		"css":        {},
		"img":        {},
		"js":         {},
		"less":       {},
		"plugins":    {},
		"debug":      {},
		"raw":        {},
		"install":    {},
		"api":        {},
		"avatarutil": {},
		"user":       {},
		"org":        {},
		"help":       {},
		"stars":      {},
		"issues":     {},
		"pulls":      {},
		"commits":    {},
		"repo":       {},
		"template":   {},
		"admin":      {},
		"new":        {},
		".":          {},
		"..":         {},
	}
	reservedUsernamePatterns = []string{"*.keys"}
)

// BeforeCreate GORM 创建前钩子
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.CreatedUnix == 0 {
		u.CreatedUnix = tx.NowFunc().Unix()
		u.UpdatedUnix = u.CreatedUnix
	}
	return nil
}

// AfterFind GORM 查询后钩子
func (u *User) AfterFind(_ *gorm.DB) error {
	u.Created = time.Unix(u.CreatedUnix, 0).Local()
	u.Updated = time.Unix(u.UpdatedUnix, 0).Local()
	return nil
}

func isNameAllowed(names map[string]struct{}, patterns []string, name string) error {
	name = strings.TrimSpace(strings.ToLower(name))
	if utf8.RuneCountInString(name) == 0 {
		return ErrNameNotAllowed{
			args: errutil.Args{
				"reason": "empty name",
			},
		}
	}

	if _, ok := names[name]; ok {
		return ErrNameNotAllowed{
			args: errutil.Args{
				"reason": "reserved",
				"name":   name,
			},
		}
	}

	for _, pattern := range patterns {
		if pattern[0] == '*' && strings.HasSuffix(name, pattern[1:]) ||
			(pattern[len(pattern)-1] == '*' && strings.HasPrefix(name, pattern[:len(pattern)-1])) {
			return ErrNameNotAllowed{
				args: errutil.Args{
					"reason":  "reserved",
					"pattern": pattern,
				},
			}
		}
	}

	return nil
}

func isUsernameAllowed(name string) error {
	return isNameAllowed(reservedUsernames, reservedUsernamePatterns, name)
}

// UsersStore 定义用户 Db 操作接口
type UsersStore interface {
	Get(id uint64) (*User, error)
	GetListById(uuids []uint64) ([]*User, error)
	Authenticate(ctx context.Context, name, passwd string) (*User, error)
	DeleteById(id uint64) error
	DeleteByName(name string) error
	CreateOrUpdate(user *User) error
}

func (db *users) DeleteById(userId uint64) error {
	err := db.Where("id = ?", userId).Delete(&User{}).Error
	if err != nil {
		return err
	}
	return nil
}

func (db *users) DeleteByName(name string) error {
	err := db.Where("name = ?", name).Delete(&User{}).Error
	if err != nil {
		return err
	}
	return nil
}

func (db *users) CreateOrUpdate(user *User) error {
	if len(user.Name) == 0 {
		return errors.New("用户名不能为空")
	}
	if len(user.Passwd) == 0 {
		return errors.New("密码不能为空")
	}

	salt, err := userutil.RandomSalt()
	if err != nil {
		return err
	}
	user.Salt = salt
	user.Passwd = userutil.EncodePassword(user.Passwd, user.Salt)

	err = db.Create(user).Error
	if err != nil {
		err = db.Updates(user).Error
		if err != nil {
			return err
		}
	}
	return nil
}

// Authenticate 用户登录验证
func (db *users) Authenticate(ctx context.Context, name, passwd string) (*User, error) {
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
		return nil, ErrUserNotExist{}
	}

	// 如果找到了
	if err == nil {
		// 验证密码
		if userutil.ValidatePassword(user.Passwd, user.Salt, passwd) {
			return user, nil
		} else {
			return nil, ErrBadCredentials{}
		}
	}

	return nil, err
}

// Get 按ID查找用户
func (db *users) Get(id uint64) (*User, error) {
	user := new(User)
	err := db.Where("id = ?", id).First(user).Error
	if err != nil {
		return nil, err
	}
	return user, nil
}

// GetByEmail 按邮箱查找用户
func (db *users) GetByEmail(ctx context.Context, email string) (*User, error) {
	if email == "" {
		return nil, ErrUserNotExist{args: errutil.Args{"email": email}}
	}
	email = strings.ToLower(email)
	user := new(User)
	err := db.WithContext(ctx).Where("email = ?", email).First(user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotExist{args: errutil.Args{"email": email}}
		}
		return nil, err
	}
	return user, nil
}

func (db *users) GetListById(uuids []uint64) ([]*User, error) {
	if len(uuids) == 0 {
		return []*User{}, nil
	}
	userList := make([]*User, 0, len(uuids))
	err := db.Where("id IN (?)", uuids).Find(&userList).Error
	if err != nil {
		return nil, err
	}

	return userList, nil
}

// IsUsernameUsed 用户是否存在
func (db *users) IsUsernameUsed(ctx context.Context, username string, excludeUserId uint64) bool {
	if username == "" {
		return false
	}
	return !errors.Is(db.WithContext(ctx).
		Select("id").
		Where("name = ? AND id != ?", strings.ToLower(username), excludeUserId).
		First(&User{}).
		Error, gorm.ErrRecordNotFound)
}

type users struct {
	*gorm.DB
}

var Users UsersStore
var _ UsersStore = (*users)(nil)

func useUsersStore(db *gorm.DB) UsersStore {
	return &users{DB: db}
}
