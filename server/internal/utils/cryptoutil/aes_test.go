package cryptoutil

import (
	"crypto/rand"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestAESGCM(t *testing.T) {
	key := make([]byte, 16) // AES-128
	_, err := rand.Read(key)
	if err != nil {
		t.Fatal(err)
	}

	plaintext := []byte("这货会被加密")

	encrypted, err := AESGCMEncrypt(key, plaintext)
	if err != nil {
		t.Fatal(err)
	}

	decrypted, err := AESGCMDecrypt(key, encrypted)
	if err != nil {
		t.Fatal(err)
	}

	assert.Equal(t, plaintext, decrypted)
}
