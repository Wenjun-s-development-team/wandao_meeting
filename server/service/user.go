package service

import (
	"errors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"wdmeeting/helper"
	"wdmeeting/models"
	"wdmeeting/result"
)

func UserLogin(c *gin.Context) {
	in := new(UserLoginRequest)
	err := c.ShouldBindJSON(in)
	if err != nil {
		result.Error(c, "参数异常")
		return
	}
	if in.Username == "" || in.Password == "" {
		result.Error(c, "必填信息为空")
		return
	}
	in.Password = helper.GetMd5(in.Password)

	user := new(models.UserBasic)
	err = models.Db.Where("username = ? AND password = ? ", in.Username, in.Password).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			result.Error(c, "用户名或密码错误")
			return
		}
		result.Error(c, "Get UserBasic Error:"+err.Error())
		return
	}

	token, err := helper.GenerateToken(user.ID, user.Username)
	if err != nil {
		result.Error(c, "GenerateToken Error:"+err.Error())
		return
	}

	c.Set("data", map[string]interface{}{
		"token": token,
		"user":  user,
	})
}
