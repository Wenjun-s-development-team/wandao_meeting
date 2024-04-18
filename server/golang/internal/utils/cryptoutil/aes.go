package cryptoutil

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"errors"
)

// AESGCMEncrypt AES 加密
func AESGCMEncrypt(key, plaintext []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}

	ciphertext := gcm.Seal(nil, nonce, plaintext, nil)
	return append(nonce, ciphertext...), nil
}

// AESGCMDecrypt AES 解密
func AESGCMDecrypt(key, ciphertext []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	size := gcm.NonceSize()
	if len(ciphertext)-size <= 0 {
		return nil, errors.New("ciphertext is empty")
	}

	nonce := ciphertext[:size]
	ciphertext = ciphertext[size:]

	return gcm.Open(nil, nonce, ciphertext, nil)
}
