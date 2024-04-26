package db

import (
	"context"
	"github.com/pkg/errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"io.wandao.meeting/internal/db/dbtest"
)

func TestUsers(t *testing.T) {
	if testing.Short() {
		t.Skip()
	}
	t.Parallel()

	ctx := context.Background()
	tables := []any{
		new(User),
	}
	db := &users{
		DB: dbtest.NewDB(t, "users", tables...),
	}

	for _, tc := range []struct {
		name string
		test func(t *testing.T, ctx context.Context, db *users)
	}{
		{"useTexts", useTexts},
	} {
		t.Run(tc.name, func(t *testing.T) {
			t.Cleanup(func() {
				err := clearTables(t, db.DB, tables...)
				require.NoError(t, err)
			})
			tc.test(t, ctx, db)
		})
		if t.Failed() {
			break
		}
	}
}

func useTexts(t *testing.T, ctx context.Context, db *users) {
	passwd := "123456"
	alice, err := db.Create(ctx, &User{
		Name:   "admin",
		Email:  "337805@qq.com",
		Passwd: passwd,
	})
	require.NoError(t, err)

	t.Run("登录-成功", func(t *testing.T) {
		user, _ := db.Login(ctx, "admin", passwd)
		assert.Equal(t, "admin", user.Name)
	})

	t.Run("登录-用户不存在", func(t *testing.T) {
		user, _ := db.Login(ctx, "bob", passwd)
		assert.Equal(t, nil, user)
	})

	t.Run("登录-密码错误", func(t *testing.T) {
		user, _ := db.Login(ctx, alice.Name, "bad_password")
		assert.Equal(t, nil, user)
	})

	t.Run("登录-邮箱地址登录", func(t *testing.T) {
		user, err := db.Login(ctx, alice.Email, passwd)
		require.NoError(t, err)
		assert.Equal(t, alice.Name, user.Name)
	})

	t.Run("登录-成功", func(t *testing.T) {
		user, err := db.Login(ctx, alice.Name, passwd)
		require.NoError(t, err)
		assert.Equal(t, alice.Name, user.Name)
	})

	t.Run("Save", func(t *testing.T) {
		err := db.Save(ctx, &User{
			Name:   "alice",
			Passwd: "123456",
			Email:  "alice@qq.com",
		})

		require.NoError(t, err)

		assert.Equal(t, nil, err)
	})

	t.Run("GetByID", func(t *testing.T) {
		alice, err := db.Create(ctx, &User{
			Name:   "alice",
			Passwd: "123456",
			Email:  "alice@qq.com",
		})
		require.NoError(t, err)

		user, err := db.GetByID(ctx, alice.Id)
		require.NoError(t, err)
		assert.Equal(t, alice.Id, user.Id)

		_, err = db.GetByID(ctx, 404)
		wantErr := errors.New("GetByID-用户不存在")
		assert.Equal(t, wantErr, err)
	})
}
