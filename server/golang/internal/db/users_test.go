package db

import (
  "context"
  "testing"
  "wdmeeting/internal/auth"
  "wdmeeting/internal/db/dbtest"
  "wdmeeting/internal/utils/errutil"

  "github.com/stretchr/testify/assert"
  "github.com/stretchr/testify/require"
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
		{"Authenticate", usersAuthenticate},
		{"GetByID", usersGetByID},
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

func usersAuthenticate(t *testing.T, ctx context.Context, db *users) {
	passwd := "pa$$word"
	alice, err := db.Create(ctx, "alice", "alice@example.com",
		CreateUserOptions{
			Passwd: passwd,
		},
	)
	require.NoError(t, err)

	t.Run("user not found", func(t *testing.T) {
		_, err := db.Authenticate(ctx, "bob", passwd)
		wantErr := auth.ErrBadCredentials{Args: map[string]any{"login": "bob"}}
		assert.Equal(t, wantErr, err)
	})

	t.Run("invalid password", func(t *testing.T) {
		_, err := db.Authenticate(ctx, alice.Name, "bad_password")
		wantErr := auth.ErrBadCredentials{Args: map[string]any{"login": alice.Name, "userID": alice.Id}}
		assert.Equal(t, wantErr, err)
	})

	t.Run("via email and password", func(t *testing.T) {
		user, err := db.Authenticate(ctx, alice.Email, passwd)
		require.NoError(t, err)
		assert.Equal(t, alice.Name, user.Name)
	})

	t.Run("via username and password", func(t *testing.T) {
		user, err := db.Authenticate(ctx, alice.Name, passwd)
		require.NoError(t, err)
		assert.Equal(t, alice.Name, user.Name)
	})

}

func usersGetByID(t *testing.T, ctx context.Context, db *users) {
	alice, err := db.Create(ctx, "alice", "alice@exmaple.com", CreateUserOptions{})
	require.NoError(t, err)

	user, err := db.GetByID(ctx, alice.Id)
	require.NoError(t, err)
	assert.Equal(t, alice.Name, user.Name)

	_, err = db.GetByID(ctx, 404)
	wantErr := ErrUserNotExist{args: errutil.Args{"userId": int64(404)}}
	assert.Equal(t, wantErr, err)
}
