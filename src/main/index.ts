import process from 'node:process'

import { BrowserWindow, app } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { useSystemService, useWindowService } from './services'

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

// 启动系统服务
useSystemService.start()

app.whenReady().then(() => {
  // 启动窗口服务
  useWindowService.start()
  useWindowService.openStartWindow()

  // 设置其它
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  app.on('activate', () => {
    // 适配MacOS
    if (BrowserWindow.getAllWindows().length === 0) {
      useWindowService.openStartWindow()
    }
  })
})

// 退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
