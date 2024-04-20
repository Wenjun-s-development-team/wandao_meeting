package service

import (
	"github.com/pkg/errors"
	"gorm.io/gorm"
	"wdmeeting/internal/context/webrtc"
	"wdmeeting/internal/db"
	"wdmeeting/internal/utils/jwtutil"
)

type UserLoginStruct struct {
	Name   string `json:"name"`
	Passwd string `json:"passwd"`
}

func UserLogin(c webrtc.Context, r webrtc.Render) {
	var form UserLoginStruct
	if err := c.ToJson(&form); err != nil {
		r.ErrorJson(err.Error())
		return
	}
	user, err := db.Users.Authenticate(c.Request().Context(), form.Name, form.Passwd)
	if err != nil {
		r.ErrorJson(err.Error())
		return
	}

	token, _ := jwtutil.GenerateToken(uint(user.Id), user.Name)

	r.SuccessJson(MapData{
		"token": token,
		"user":  user,
	})
}

func UserInfo(c webrtc.Context, r webrtc.Render, claim webrtc.UserClaims) {
	user, err := db.Users.GetByID(c.Request().Context(), int64(claim.User.Id))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			r.ErrorJson("用户不存在")
			return
		}
		r.ErrorJson("Unauthorized Authorization:" + err.Error())
		return
	}

	r.SuccessJson(MapData{
		"user": user,
	})
}
