package db

import (
	"context"
	"fmt"
	"time"
	"wdmeeting/internal/utils/cryptoutil"
	"wdmeeting/internal/utils/errutil"

	"github.com/google/uuid"
	"github.com/pkg/errors"
	"gorm.io/gorm"
)

// AccessTokensStore 访问令牌存储接口
type AccessTokensStore interface {
	Create(ctx context.Context, userId int64, name string) (*AccessToken, error)
	DeleteByID(ctx context.Context, userId, id int64) error
	GetBySHA1(ctx context.Context, sha1 string) (*AccessToken, error)
	List(ctx context.Context, userId int64) ([]*AccessToken, error)
	Touch(ctx context.Context, id int64) error
}

var AccessTokens AccessTokensStore

// AccessToken 个人访问令牌
type AccessToken struct {
	Id     int64 `gorm:"primarykey"`
	UserId int64 `xorm:"uid" gorm:"column:uid;index"`
	Name   string
	Sha1   string `gorm:"type:VARCHAR(40);unique"`
	SHA256 string `gorm:"type:VARCHAR(64);unique;not null"`

	Created           time.Time `gorm:"-" json:"-"`
	CreatedUnix       int64
	Updated           time.Time `gorm:"-" json:"-"`
	UpdatedUnix       int64
	HasRecentActivity bool `gorm:"-" json:"-"`
	HasUsed           bool `gorm:"-" json:"-"`
}

// BeforeCreate 实现 GORM 创建前钩子
func (t *AccessToken) BeforeCreate(tx *gorm.DB) error {
	if t.CreatedUnix == 0 {
		t.CreatedUnix = tx.NowFunc().Unix()
	}
	return nil
}

// AfterFind 实现 GORM 查询后钩子
func (t *AccessToken) AfterFind(tx *gorm.DB) error {
	t.Created = time.Unix(t.CreatedUnix, 0).Local()
	if t.UpdatedUnix > 0 {
		t.Updated = time.Unix(t.UpdatedUnix, 0).Local()
		t.HasUsed = t.Updated.After(t.Created)
		t.HasRecentActivity = t.Updated.Add(7 * 24 * time.Hour).After(tx.NowFunc())
	}
	return nil
}

var _ AccessTokensStore = (*accessTokens)(nil)

type accessTokens struct {
	*gorm.DB
}

type ErrAccessTokenAlreadyExist struct {
	args errutil.Args
}

func IsErrAccessTokenAlreadyExist(err error) bool {
	var errAccessTokenAlreadyExist ErrAccessTokenAlreadyExist
	ok := errors.As(err, &errAccessTokenAlreadyExist)
	return ok
}

func (err ErrAccessTokenAlreadyExist) Error() string {
	return fmt.Sprintf("access token already exists: %v", err.args)
}

func (db *accessTokens) Create(ctx context.Context, userId int64, name string) (*AccessToken, error) {
	err := db.WithContext(ctx).Where("uid = ? AND name = ?", userId, name).First(new(AccessToken)).Error
	if err == nil {
		return nil, ErrAccessTokenAlreadyExist{args: errutil.Args{"userId": userId, "name": name}}
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	token := cryptoutil.SHA1(uuid.New().String())
	sha256 := cryptoutil.SHA256(token)

	accessToken := &AccessToken{
		UserId: userId,
		Name:   name,
		Sha1:   sha256[:40],
		SHA256: sha256,
	}
	if err = db.WithContext(ctx).Create(accessToken).Error; err != nil {
		return nil, err
	}

	accessToken.Sha1 = token
	return accessToken, nil
}

func (db *accessTokens) DeleteByID(ctx context.Context, userId, id int64) error {
	return db.WithContext(ctx).Where("id = ? AND uid = ?", id, userId).Delete(new(AccessToken)).Error
}

var _ errutil.NotFound = (*ErrAccessTokenNotExist)(nil)

type ErrAccessTokenNotExist struct {
	args errutil.Args
}

func IsErrAccessTokenNotExist(err error) bool {
	var errAccessTokenNotExist ErrAccessTokenNotExist
	ok := errors.As(errors.Cause(err), &errAccessTokenNotExist)
	return ok
}

func (err ErrAccessTokenNotExist) Error() string {
	return fmt.Sprintf("access token does not exist: %v", err.args)
}

func (ErrAccessTokenNotExist) NotFound() bool {
	return true
}

func (db *accessTokens) GetBySHA1(ctx context.Context, sha1 string) (*AccessToken, error) {
	if sha1 == "" {
		return nil, ErrAccessTokenNotExist{args: errutil.Args{"sha": sha1}}
	}

	sha256 := cryptoutil.SHA256(sha1)
	token := new(AccessToken)
	err := db.WithContext(ctx).Where("sha256 = ?", sha256).First(token).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAccessTokenNotExist{args: errutil.Args{"sha": sha1}}
		}
		return nil, err
	}
	return token, nil
}

func (db *accessTokens) List(ctx context.Context, userId int64) ([]*AccessToken, error) {
	var tokens []*AccessToken
	return tokens, db.WithContext(ctx).Where("uid = ?", userId).Order("id ASC").Find(&tokens).Error
}

func (db *accessTokens) Touch(ctx context.Context, id int64) error {
	return db.WithContext(ctx).
		Model(new(AccessToken)).
		Where("id = ?", id).
		UpdateColumn("updated_unix", db.NowFunc().Unix()).
		Error
}
