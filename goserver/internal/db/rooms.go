package db

import (
	"context"
	"time"

	"github.com/pkg/errors"
	"gorm.io/gorm"
)

// Room 用户表结构体
type Room struct {
	Id     uint64 `gorm:"primaryKey" json:"id"`
	UserId uint64 `json:"userId"`
	Name   string `xorm:"UNIQUE NOT NULL" gorm:"unique;not null" json:"name"`

	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

type RoomInput struct {
	Name string `xorm:"UNIQUE NOT NULL" json:"name"`
}

type RoomsStore interface {
	Save(ctx context.Context, room *Room) error
	Create(ctx context.Context, room *Room) (*Room, error)
	GetByID(ctx context.Context, roomId uint64) (*Room, error)
	GetByName(ctx context.Context, name string) (*Room, error)
	DeleteByID(ctx context.Context, roomId uint64) error
	DeleteByName(ctx context.Context, name string) error
}

type rooms struct {
	*gorm.DB
}

var Rooms RoomsStore
var _ RoomsStore = (*rooms)(nil)

func (db *rooms) Save(ctx context.Context, room *Room) error {
	if len(room.Name) == 0 {
		return errors.New("房间名称必须")
	}

	err := db.WithContext(ctx).FirstOrCreate(&room, "name = ?", room.Name).Error
	if err != nil {
		return err
	}
	return nil
}

func (db *rooms) Create(ctx context.Context, room *Room) (*Room, error) {
	if len(room.Name) == 0 {
		return nil, errors.New("房间名称必须")
	}

	return room, db.WithContext(ctx).Create(&room).Error
}

func (db *rooms) GetByID(ctx context.Context, roomId uint64) (*Room, error) {
	room := new(Room)
	err := db.WithContext(ctx).Where("id = ?", roomId).First(&room).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.Wrapf(err, "房间不存在(%d)", roomId)
		}
		return nil, err
	}
	return room, nil
}

func (db *rooms) GetByName(ctx context.Context, name string) (*Room, error) {
	room := new(Room)
	err := db.WithContext(ctx).Where("name = ?", name).First(&room).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.Wrapf(err, "用户不存在(%s)", name)
		}
		return nil, err
	}
	return room, nil
}

func (db *rooms) DeleteByID(ctx context.Context, roomId uint64) error {
	var room User
	return db.WithContext(ctx).Unscoped().Where("id=?", roomId).Delete(&room).Error
}

func (db *rooms) DeleteByName(ctx context.Context, name string) error {
	var room User
	return db.WithContext(ctx).Unscoped().Where("name=?", name).Delete(&room).Error
}

func useRoomsStore(db *gorm.DB) RoomsStore {
	return &rooms{DB: db}
}
