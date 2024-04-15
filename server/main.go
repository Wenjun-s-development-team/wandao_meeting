package main

import (
  "log"
  "wdmeeting/models"
  "wdmeeting/router"
)

func main() {
  models.InitDb()
  r := router.Router()

  if err := r.Run(":8080"); err != nil {
    log.Fatal("failed run app: ", err)
  }
}
