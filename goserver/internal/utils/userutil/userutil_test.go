package userutil

import (
	"fmt"
	"os"
	"runtime"
	"testing"

	"io.wandao.meeting/internal/conf"
	"io.wandao.meeting/internal/utils/osutil"
	"io.wandao.meeting/public"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCustomAvatarPath(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Skipping testing on Windows")
		return
	}

	conf.SetMockAvatar(t,
		conf.AvatarOpts{
			AvatarUploadPath: "data/avatars",
		},
	)

	got := CustomAvatarPath(1)
	want := "data/avatars/1"
	assert.Equal(t, want, got)
}

func TestGenerateRandomAvatar(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Skipping testing on Windows")
		return
	}

	conf.SetMockAvatar(t,
		conf.AvatarOpts{
			AvatarUploadPath: os.TempDir(),
		},
	)

	avatarPath := CustomAvatarPath(1)
	defer func() { _ = os.Remove(avatarPath) }()

	err := GenerateRandomAvatar(1, "elkon", "elkon@example.com")
	require.NoError(t, err)
	got := osutil.IsFile(avatarPath)
	assert.True(t, got)
}

func TestSaveAvatar(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Skipping testing on Windows")
		return
	}

	conf.SetMockAvatar(t,
		conf.AvatarOpts{
			AvatarUploadPath: os.TempDir(),
		},
	)

	avatar, err := public.Files.ReadFile("img/avatar_default.png")
	require.NoError(t, err)

	avatarPath := CustomAvatarPath(1)
	defer func() { _ = os.Remove(avatarPath) }()

	err = SaveAvatar(1, avatar)
	require.NoError(t, err)
	got := osutil.IsFile(avatarPath)
	assert.True(t, got)
}

func TestEncodePassword(t *testing.T) {
	want := EncodePassword("123456", "rands")
	tests := []struct {
		name      string
		password  string
		salt      string
		wantEqual bool
	}{
		{
			name:      "admin",
			password:  "123456",
			salt:      "rands",
			wantEqual: true,
		},
		{
			name:      "wrong password",
			password:  "111333",
			salt:      "rands",
			wantEqual: false,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got := EncodePassword(test.password, test.salt)
			fmt.Printf("input: %v | output: %v\n", test.password, got)
			if test.wantEqual {
				assert.Equal(t, want, got)
			} else {
				assert.NotEqual(t, want, got)
			}
		})
	}
}

func TestValidatePassword(t *testing.T) {
	want := EncodePassword("123456", "rands")
	tests := []struct {
		name      string
		password  string
		salt      string
		wantEqual bool
	}{
		{
			name:      "correct",
			password:  "123456",
			salt:      "rands",
			wantEqual: true,
		},

		{
			name:      "wrong password",
			password:  "111333",
			salt:      "rands",
			wantEqual: false,
		},
		{
			name:      "wrong salt",
			password:  "111333",
			salt:      "salt",
			wantEqual: false,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got := ValidatePassword(want, test.salt, test.password)
			assert.Equal(t, test.wantEqual, got)
		})
	}
}

func TestRandomSalt(t *testing.T) {
	salt1, err := RandomSalt()
	require.NoError(t, err)
	salt2, err := RandomSalt()
	require.NoError(t, err)
	assert.NotEqual(t, salt1, salt2)
}
