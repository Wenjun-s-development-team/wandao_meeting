package db

import (
	"context"
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
}

type rooms struct {
	*gorm.DB
}

var Rooms RoomsStore
var _ RoomsStore = (*rooms)(nil)

func (db *rooms) Get(ctx context.Context, id uint64) (*Room, error) {
	room := new(Room)
	err := db.WithContext(ctx).Where("id = ?", id).First(room).Error
	if err != nil {
		return nil, err
	}
	return room, nil
}

func (db *rooms) List(ctx context.Context, page, limit int) ([]*Room, error) {
	rooms := make([]*Room, 0, limit)
	return rooms, db.WithContext(ctx).
		Limit(limit).Offset((page - 1) * limit).
		Order("id ASC").
		Find(&rooms).
		Error
}

func (db *rooms) Create(ctx context.Context, userId uint64, name string) (*Room, error) {
	room := &Room{
		UserId: userId,
		Name:   name,
	}
	return room, db.WithContext(ctx).Create(room).Error
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
