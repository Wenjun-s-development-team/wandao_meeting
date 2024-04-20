// Copyright 2020 The Gogs Authors. All rights reserved.
// Use of this source code is governed by a MIT-style
// license that can be found in the LICENSE file.

package cryptoutil

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMD5(t *testing.T) {
	input := "admin"
	t.Run(input, func(t *testing.T) {
		output := MD5(input)
		fmt.Printf("input: %v | output: %v", input, output)
		assert.Equal(t, output, MD5(input))
	})
}
