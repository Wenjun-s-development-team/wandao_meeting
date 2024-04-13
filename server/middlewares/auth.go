package middlewares

import (
	"github.com/gin-gonic/gin"
	"wdmeeting/helper"
	"wdmeeting/result"
)

func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		userClaim, err := helper.AnalyseToken(auth)
		if err != nil {
			c.Abort()
			result.Error(c, "Unauthorized Authorization")
			return
		}
		if userClaim == nil {
			c.Abort()
			result.Error(c, "Unauthorized Admin")
			return
		}
		c.Set("user_claims", userClaim)
		c.Next()
	}
}
