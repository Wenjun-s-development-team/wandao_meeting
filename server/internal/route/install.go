package route

import (
  "strconv"
  "wdmeeting/internal/conf"
  "wdmeeting/internal/db"

  log "unknwon.dev/clog/v2"
)

func Install() {
  err := conf.Init()
  if err != nil {
    log.Fatal("Failed to initialize application: %v", err)
  }

  conf.InitLogging(false)

  _, err = db.SetEngine()
  if err != nil {
    log.Fatal("SetEngine error: %v", err)
  }

  log.Info("%s %s", conf.App.BrandName, conf.App.Version)
  log.Trace("Work directory: %s", conf.WorkDir())
  log.Trace("Log path: %s", conf.Log.RootPath)
  log.Trace("Build time: %s", conf.BuildTime)
  log.Trace("Build commit: %s", conf.BuildCommit)

  HTTPPort, _ := strconv.Atoi(conf.Server.HTTPPort)

  APIServer().Run(conf.Server.HTTPAddr, HTTPPort)
}
