import type { IpcMainInvokeEvent } from 'electron'
import { ipcMain } from 'electron'

import { Service } from '../service'
import { WindowManager } from './windowManager'

export class WindowService extends Service {
  windowManager: WindowManager = new WindowManager()

  constructor() {
    super()
    console.log('WindowService constructor')
  }

  start() {
    ipcMain.handle('windows', this.methodHandler.bind(this))
  }

  // 打开新开始界面
  openStartWindow() {
    return this.windowManager.openStartWindow()
  }

  // 打开开发者工具
  openDevTools(event: IpcMainInvokeEvent, args: KeyValue) {
    const win = this.windowManager.getWindow(event.sender.id)?.window
    win?.webContents.openDevTools({ mode: args.mode || 'bottom' })
    return this.success()
  }

  // 关闭窗口
  closeWindow(event: IpcMainInvokeEvent) {
    this.windowManager.close(event.sender.id)
    return this.success()
  }

  // 最小化窗口
  minimizeWindow(event: IpcMainInvokeEvent) {
    this.windowManager.minimize(event.sender.id)
    return this.success()
  }

  // 最大化窗口
  maximizeWindow(event: IpcMainInvokeEvent) {
    this.windowManager.minMaxSwitch(event.sender.id)
    return this.success()
  }
}

export const useWindowService = new WindowService()
