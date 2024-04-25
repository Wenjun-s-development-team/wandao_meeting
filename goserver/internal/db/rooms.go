package db

import (
	"context"
	"github.com/pkg/errors"
	"gorm.io/gorm"
)

// Room 用户表结构体
type Room struct {
	Id     uint64 `gorm:"primaryKey" json:"id"`
	UserId uint64 `json:"userId"`
	Name   string `xorm:"UNIQUE NOT NULL" gorm:"unique;not null" json:"name"`
}

type CreateRoom struct {
	Name string `xorm:"UNIQUE NOT NULL" json:"name"`
}

type RoomsStore interface {
	Get(id uint64) (*Room, error)
	CreateOrUpdate(user *Room) error
}

type rooms struct {
	*gorm.DB
}

var Rooms RoomsStore
var _ RoomsStore = (*rooms)(nil)

func (db *rooms) Get(id uint64) (*Room, error) {
	room := new(Room)
	err := db.Where("id = ?", id).First(room).Error
	if err != nil {
		return nil, err
	}
	return room, nil
}

func (db *rooms) CreateOrUpdate(room *Room) error {
	if len(room.Name) == 0 {
		return errors.New("名称不能为空")
	}

	err := db.Create(room).Error
	if err != nil {
		err = db.Updates(room).Error
		if err != nil {
			return err
		}
	}
	return nil
}

func (db *rooms) List(ctx context.Context, page, limit int) ([]*Room, error) {
	rooms := make([]*Room, 0, limit)
	return rooms, db.WithContext(ctx).
		Limit(limit).Offset((page - 1) * limit).
		Order("id ASC").
		Find(&rooms).
		Error
}

func (db *rooms) Save(ctx context.Context, data Room) (*Room, error) {
	room := &Room{}
	return room, db.WithContext(ctx).Save(data).Error
}

func (db *rooms) Count(ctx context.Context) int64 {
	var count int64
	db.WithContext(ctx).Model(&Room{}).Count(&count)
	return count
}

func useRoomsStore(db *gorm.DB) RoomsStore {
	return &rooms{DB: db}
}
