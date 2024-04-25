package conf

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFileNames(t *testing.T) {
	names, err := FileNames(".")
	require.NoError(t, err)

	want := []string{"app.ini", "readme"}
	assert.Equal(t, want, names)
}
