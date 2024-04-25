package admin

import (
	"github.com/gin-gonic/gin"
	"io.wandao.meeting/internal/context"
	"io.wandao.meeting/internal/db"
	"io.wandao.meeting/internal/utils/userutil"
	log "unknwon.dev/clog/v2"
)

func SaveUser(c *context.APIContext) {
	in := &db.User{
		Name:   c.Query("name"),
		Passwd: c.Query("passwd"),
	}

	log.Trace("name: %s, passwd: %s", in.Name, in.Passwd)

	if len(in.Name) == 0 {
		c.ResultError("必须输入用户名")
		return
	}

	if len(in.Passwd) == 0 {
		err := db.Users.DeleteByName(in.Name)
		if err != nil {
			c.ResultError("删除用户失败")
			return
		}
	} else {
		user := &db.User{
			Name:   in.Name,
			Passwd: in.Passwd,
		}

		salt, err := userutil.RandomSalt()
		if err != nil {
			c.ResultError(err.Error())
		}
		user.Salt = salt
		user.Passwd = userutil.EncodePassword(user.Passwd, user.Salt)

		err = db.Users.CreateOrUpdate(user)
		if err != nil {
			c.ResultError("创建或更新用户失败")
			return
		}
	}

	c.Set("data", gin.H{
		"message": "操作成功",
	})
}

func SaveRoom(c *context.APIContext) {
	in := &db.Room{
		Name: c.Query("name"),
	}

	log.Trace("name: %s", in.Name)

	if len(in.Name) == 0 {
		c.ResultError("必须输入名称")
		return
	}

	err := db.Rooms.CreateOrUpdate(in)
	if err != nil {
		c.ResultError("创建或更新失败")
		return
	}

	c.Set("data", gin.H{
		"message": "操作成功",
	})
}
