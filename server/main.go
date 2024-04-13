package main

import (
	"log"
	"wdmeeting/models"
	"wdmeeting/router"
)

func main() {
	models.InitDb()
	e := router.Router()
	err := e.Run()
	if err != nil {
		log.Fatalln("run err.", err)
		return
	}
}
