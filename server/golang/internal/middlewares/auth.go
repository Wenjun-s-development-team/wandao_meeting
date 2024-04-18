package middlewares

import (
	"wdmeeting/internal/result"
	"wdmeeting/internal/utils/authutil"

	"github.com/flamego/auth"
	"github.com/flamego/flamego"
)

func Auth(r flamego.Render, token auth.Token) flamego.Handler {
	return flamego.ContextInvoker(func(c flamego.Context) {
		userClaim, err := authutil.AnalyseToken(string(token))
		if err != nil {
			result.Error(r, "Unauthorized Authorization")
			return
		}
		if userClaim == nil {
			result.Error(r, "Unauthorized Admin")
			return
		}

		c.Map(userClaim)
	})
}
