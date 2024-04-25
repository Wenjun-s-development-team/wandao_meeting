// Package home 首页
package home

import (
	"io.wandao.meeting/internal/context"
	"net/http"
)

// Index 首页
func Index(c *context.APIContext) {
	c.String(http.StatusOK, "home")
}
