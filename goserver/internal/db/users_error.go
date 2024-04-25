package db

import (
	"fmt"

	"io.wandao.meeting/internal/utils/errutil"

	"github.com/pkg/errors"
)

// ---- 用户不存在 -----

type ErrUserNotExist struct {
	args errutil.Args
}

var _ errutil.NotFound = (*ErrUserNotExist)(nil)

func (err ErrUserNotExist) Error() string {
	return "用户不存在"
}

func (ErrUserNotExist) NotFound() bool {
	return true
}

func IsErrUserNotExist(err error) bool {
	var errUserNotExist ErrUserNotExist
	ok := errors.As(errors.Cause(err), &errUserNotExist)
	return ok
}

// ---- 密码错误 -----
var _ errutil.NotFound = (*ErrBadCredentials)(nil)

type ErrBadCredentials struct {
	Args errutil.Args
}

func (err ErrBadCredentials) Error() string {
	return "登录账号或密码错误"
}

func (ErrBadCredentials) NotFound() bool {
	return true
}

// ---- 用户名 不允许的-----

type ErrNameNotAllowed struct {
	args errutil.Args
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

func IsErrNameNotAllowed(err error) bool {
	var errNameNotAllowed ErrNameNotAllowed
	ok := errors.As(errors.Cause(err), &errNameNotAllowed)
	return ok
}

// ---- 用户名 已注册-----

type ErrUserAlreadyExist struct {
	args errutil.Args
}

func (err ErrUserAlreadyExist) Error() string {
	return fmt.Sprintf("user already exists: %v", err.args)
}

func IsErrUserAlreadyExist(err error) bool {
	var errUserAlreadyExist ErrUserAlreadyExist
	ok := errors.As(errors.Cause(err), &errUserAlreadyExist)
	return ok
}

// ---- email 已注册-----

type ErrEmailAlreadyUsed struct {
	args errutil.Args
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

func IsErrEmailAlreadyUsed(err error) bool {
	var errEmailAlreadyUsed ErrEmailAlreadyUsed
	ok := errors.As(errors.Cause(err), &errEmailAlreadyUsed)
	return ok
}
