package service

import (
	"errors"
	"wdmeeting/internal/db"
	"wdmeeting/internal/result"
	"wdmeeting/internal/utils/authutil"

	"github.com/flamego/flamego"
	"gorm.io/gorm"
)

func UserLogin(c flamego.Context, r flamego.Render) {
	in := c.Params()
	user, _ := db.Users.Authenticate(c.Request().Context(), in["name"], in["passwd"])
	result.Success(r, user)
}

func UserInfo(c flamego.Context, r flamego.Render, userClaim authutil.UserClaims) {
	user, err := db.Users.GetByID(c.Request().Context(), int64(userClaim.Id))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			result.Error(r, "用户不存在")
			return
		}
		result.Error(r, "Get UserBasic Error:"+err.Error())
		return
	}

	result.Success(r, user)
}
