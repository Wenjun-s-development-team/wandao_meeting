package dbutil

import (
	"fmt"
	"io"
)

type Logger struct {
	io.Writer
}

func (l *Logger) Printf(format string, args ...any) {
	_, _ = fmt.Fprintf(l.Writer, format, args...)
}
