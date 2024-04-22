package public

import (
	"embed"
)

//go:embed assets/* img/*
var Files embed.FS
