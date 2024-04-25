package conf

import (
	"sync"
	"testing"
)

func SetMockApp(t *testing.T, opts AppOpts) {
	before := App
	App = opts
	t.Cleanup(func() {
		App = before
	})
}

var mockServer sync.Mutex

func SetMockServer(t *testing.T, opts ServerOpts) {
	mockServer.Lock()
	before := Server
	Server = opts
	t.Cleanup(func() {
		Server = before
		mockServer.Unlock()
	})
}

var mockAvatar sync.Mutex

func SetMockAvatar(t *testing.T, opts AvatarOpts) {
	mockAvatar.Lock()
	before := Avatar
	Avatar = opts
	t.Cleanup(func() {
		Avatar = before
		mockAvatar.Unlock()
	})
}
