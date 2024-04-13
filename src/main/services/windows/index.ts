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
    return this
  }

  methodHandler(event: IpcMainInvokeEvent, method: string, args: string) {
    console.log('methodHandler', method, args)
    if (typeof this[method] === 'function') {
      args = JSON.parse(args)
      return this[method](event, args)
    }
    const message = `${method} does not exist on the instance`
    console.log(message)
    return this.error(message)
  }

  // 打开新开始界面
  openStartWindow() {
    return this.windowManager.openStartWindow()
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
