package dbutil

import (
	"fmt"
)

func Quote(format string, args ...string) string {
	anys := make([]any, len(args))
	for i := range args {
		anys[i] = args[i]
	}
	return fmt.Sprintf(format, anys...)
}
