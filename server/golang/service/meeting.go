package service

import (
	"github.com/gin-gonic/gin"
	"time"
	"wdmeeting/helper"
	"wdmeeting/models"
	"wdmeeting/result"
)

func MeetingList(c *gin.Context) {
	in := new(MeetingListRequest)
	err := c.ShouldBindQuery(in)
	if err != nil {
		result.Error(c, "参数异常")
		return
	}
	var list []*MeetingListReply
	var count int64
	tx := models.Db.Model(&models.RoomBasic{})
	if in.Keyword != "" {
		tx.Where("name LIKE ?", "%"+in.Keyword+"%")
	}
	err = tx.Count(&count).Limit(in.Limit).Offset((in.Page - 1) * in.Limit).Find(&list).Error
	if err != nil {
		result.Error(c, "系统异常："+err.Error())
		return
	}

	c.Set("data", gin.H{
		"list":  list,
		"count": count,
	})
}

func MeetingCreate(c *gin.Context) {
	uc := c.MustGet("user_claims").(*helper.UserClaims)
	in := new(MeetingCreateRequest)
	err := c.ShouldBindJSON(in)
	if err != nil {
		result.Error(c, "参数异常")
		return
	}
	err = models.Db.Create(&models.RoomBasic{
		Identity: helper.GetUUID(),
		Name:     in.Name,
		BeginAt:  time.UnixMilli(in.BeginAt),
		EndAt:    time.UnixMilli(in.EndAt),
		CreateId: uc.Id,
	}).Error
	if err != nil {
		result.Error(c, "系统异常："+err.Error())
		return
	}
	result.Success(c, nil)
}

func MeetingUpdate(c *gin.Context) {
	uc := c.MustGet("user_claims").(*helper.UserClaims)
	in := new(MeetingEditRequest)
	err := c.ShouldBindJSON(in)
	if err != nil {
		result.Error(c, "参数异常")
		return
	}
	err = models.Db.Model(new(models.RoomBasic)).Where("identity = ? AND create_id = ?", in.Identity, uc.Id).
		Updates(map[string]any{
			"name":     in.Name,
			"begin_at": time.UnixMilli(in.BeginAt),
			"end_at":   time.UnixMilli(in.EndAt),
		}).Error
	if err != nil {
		result.Error(c, "系统异常："+err.Error())
		return
	}
	result.Success(c, nil)
}

func MeetingRemove(c *gin.Context) {
	identity := c.Query("identity")
	uc := c.MustGet("user_claims").(*helper.UserClaims)
	err := models.Db.Where("identity = ? AND create_id = ?", identity, uc.Id).Delete(&models.RoomBasic{}).Error
	if err != nil {
		result.Error(c, "系统异常："+err.Error())
		return
	}
	result.Success(c, nil)
}
