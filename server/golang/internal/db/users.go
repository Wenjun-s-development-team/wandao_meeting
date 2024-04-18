package db

import (
	"context"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"
	"wdmeeting/internal/auth"
	"wdmeeting/internal/utils/cryptoutil"
	"wdmeeting/internal/utils/errutil"
	"wdmeeting/internal/utils/userutil"

	"github.com/pkg/errors"
	"gorm.io/gorm"
)

// User 用户表结构体
type User struct {
	// gorm.Model
	Id     int64 `gorm:"primaryKey"`
	Type   UserType
	Name   string `xorm:"UNIQUE NOT NULL" gorm:"unique;not null" json:"name"`
	Passwd string `xorm:"passwd NOT NULL" gorm:"column:passwd;not null" json:"-"`
	Alias  string `xorm:"VARCHAR(255)" gorm:"type:varchar(255);" json:"alias"`
	Email  string `xorm:"NOT NULL" gorm:"not null"`
	Avatar string `xorm:"VARCHAR(2048)" gorm:"type:VARCHAR(2048);"`
	Salt   string `xorm:"VARCHAR(10)" gorm:"type:VARCHAR(10)"`

	Created     time.Time `xorm:"-" gorm:"-" json:"-"`
	CreatedUnix int64
	Updated     time.Time `xorm:"-" gorm:"-" json:"-"`
	UpdatedUnix int64

	IsActive bool
	IsAdmin  bool
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

type ErrUserNotExist struct {
	args errutil.Args
}

var _ errutil.NotFound = (*ErrUserNotExist)(nil)

// IsErrUserNotExist 如果错误类型为 ErrUserNotExist 返回 true
func IsErrUserNotExist(err error) bool {
	var errUserNotExist ErrUserNotExist
	ok := errors.As(errors.Cause(err), &errUserNotExist)
	return ok
}

func (err ErrUserNotExist) Error() string {
	return fmt.Sprintf("user does not exist: %v", err.args)
}

func (ErrUserNotExist) NotFound() bool {
	return true
}

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

var (
	reservedUsernames = map[string]struct{}{
		"-":        {},
		"explore":  {},
		"create":   {},
		"assets":   {},
		"css":      {},
		"img":      {},
		"js":       {},
		"less":     {},
		"plugins":  {},
		"debug":    {},
		"raw":      {},
		"install":  {},
		"api":      {},
		"avatar":   {},
		"user":     {},
		"org":      {},
		"help":     {},
		"stars":    {},
		"issues":   {},
		"pulls":    {},
		"commits":  {},
		"repo":     {},
		"template": {},
		"admin":    {},
		"new":      {},
		".":        {},
		"..":       {},
	}
	reservedUsernamePatterns = []string{"*.keys"}
)

type ErrNameNotAllowed struct {
	args errutil.Args
}

func IsErrNameNotAllowed(err error) bool {
	_, ok := errors.Cause(err).(ErrNameNotAllowed)
	return ok
}

func (err ErrNameNotAllowed) Value() string {
	val, ok := err.args["name"].(string)
	if ok {
		return val
	}

	val, ok = err.args["pattern"].(string)
	if ok {
		return val
	}

	return "<value not found>"
}

func (err ErrNameNotAllowed) Error() string {
	return fmt.Sprintf("name is not allowed: %v", err.args)
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

// UsersStore 定义用户Db操作接口
type UsersStore interface {
	Authenticate(ctx context.Context, name, passwd string) (*User, error)
	GetByID(ctx context.Context, id int64) (*User, error)
	IsUsernameUsed(ctx context.Context, username string, excludeUserId int64) bool
}

type ErrUserAlreadyExist struct {
	args errutil.Args
}

// IsErrUserAlreadyExist returns true if the underlying error has the type
// ErrUserAlreadyExist.
func IsErrUserAlreadyExist(err error) bool {
	_, ok := errors.Cause(err).(ErrUserAlreadyExist)
	return ok
}

func (err ErrUserAlreadyExist) Error() string {
	return fmt.Sprintf("user already exists: %v", err.args)
}

type ErrEmailAlreadyUsed struct {
	args errutil.Args
}

// IsErrEmailAlreadyUsed returns true if the underlying error has the type ErrEmailAlreadyUsed.
func IsErrEmailAlreadyUsed(err error) bool {
	_, ok := errors.Cause(err).(ErrEmailAlreadyUsed)
	return ok
}

func (err ErrEmailAlreadyUsed) Email() string {
	email, ok := err.args["email"].(string)
	if ok {
		return email
	}
	return "<email not found>"
}

func (err ErrEmailAlreadyUsed) Error() string {
	return fmt.Sprintf("email has been used: %v", err.args)
}

type UserType int

const (
	UserTypeIndividual UserType = iota
	UserTypeOrganization
)

func (db *users) Create(ctx context.Context, username, email string, opts CreateUserOptions) (*User, error) {
	err := isUsernameAllowed(username)
	if err != nil {
		return nil, err
	}

	if db.IsUsernameUsed(ctx, username, 0) {
		return nil, ErrUserAlreadyExist{
			args: errutil.Args{
				"name": username,
			},
		}
	}

	email = strings.ToLower(strings.TrimSpace(email))
	_, err = db.GetByEmail(ctx, email)
	if err == nil {
		return nil, ErrEmailAlreadyUsed{
			args: errutil.Args{
				"email": email,
			},
		}
	} else if !IsErrUserNotExist(err) {
		return nil, err
	}

	user := &User{
		Name:     username,
		Email:    email,
		Passwd:   opts.Passwd,
		IsActive: opts.Activated,
		IsAdmin:  opts.Admin,
		Avatar:   cryptoutil.MD5(email),
	}

	user.Salt, err = userutil.RandomSalt()
	if err != nil {
		return nil, err
	}
	user.Passwd = userutil.EncodePassword(user.Passwd, user.Salt)

	return user, db.WithContext(ctx).Create(user).Error
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
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, errors.Wrap(err, "get user")
	}

	// 如果找到了
	if err == nil {
		// 验证密码
		if userutil.ValidatePassword(user.Passwd, user.Salt, passwd) {
			return user, nil
		}
	}

	return nil, auth.ErrBadCredentials{Args: map[string]any{"login": name, "userId": user.Id}}
}

// GetByEmail 按ID查找用户
func (db *users) GetByID(ctx context.Context, id int64) (*User, error) {
	user := new(User)
	err := db.WithContext(ctx).Where("id = ?", id).First(user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotExist{args: errutil.Args{"userId": id}}
		}
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

// IsUsernameUsed 用户是否存在
func (db *users) IsUsernameUsed(ctx context.Context, username string, excludeUserId int64) bool {
	if username == "" {
		return false
	}
	return db.WithContext(ctx).
		Select("id").
		Where("name = ? AND id != ?", strings.ToLower(username), excludeUserId).
		First(&User{}).
		Error != gorm.ErrRecordNotFound
}

var Users UsersStore

var _ UsersStore = (*users)(nil)

type users struct {
	*gorm.DB
}

func useUsersStore(db *gorm.DB) UsersStore {
	return &users{DB: db}
}
