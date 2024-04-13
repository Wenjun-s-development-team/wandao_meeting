import process from 'node:process'
import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { BrowserWindow } from 'electron'
import { Service } from '../service'

export function loadPage(win: BrowserWindow, url: string) {
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/#${url}`)
  } else {
    win.loadFile(join(__dirname, `../renderer/index.html`), { hash: `#${url}` })
  }
}

/**
 * @description 用于维护单个窗口
 */
export class Window extends Service {
  window: BrowserWindow
  type: 'start' | 'main' | 'default' = 'default'
  currentBaseURL: string

  constructor(win: BrowserWindow, type?: 'start' | 'main' | 'default') {
    super()
    this.window = win
    this.currentBaseURL = ''
    this.type = type || 'default'
  }

  start() {}

  close() {
    this.window.close()
  }

  minimize() {
    this.window.minimize()
  }

  maximize() {
    this.window.maximize()
  }

  unmaximize() {
    this.window.unmaximize()
  }

  minMaxSwitch() {
    if (this.window.isMaximized()) {
      this.window.unmaximize()
    } else {
      this.window.maximize()
    }
  }
}

/**
 * @description 用于维护全部打开窗口
 */
export class WindowManager extends Service {
  windows: Map<number, Window>

  constructor() {
    super()
    this.windows = new Map()
  }

  start() {}

  get(id: number) {
    return this.windows.get(id)
  }

  getWindow(id: number) {
    return this.windows.get(id)
  }

  open(bWindow: BrowserWindow | Window, type?: 'start' | 'main' | 'default') {
    if (bWindow instanceof BrowserWindow) {
      const window = new Window(bWindow, type)
      return this.windows.set(bWindow.webContents.id, window)
    } else {
      return this.windows.set(bWindow.window.webContents.id, bWindow)
    }
  }

  close(id: number) {
    const window = this.windows.get(id)
    window?.close()
    this.windows.delete(id)
  }

  minimize(id: number) {
    const window = this.windows.get(id)
    window?.minimize()
  }

  minMaxSwitch(id: number) {
    const window = this.windows.get(id)
    window?.minMaxSwitch()
  }

  openStartWindow() {
    const win = new BrowserWindow({
      width: 1600,
      height: 1024,
      show: false,
      frame: false,
      resizable: true,
      autoHideMenuBar: true,
      webPreferences: {
        sandbox: false,
        webSecurity: false,
        preload: join(__dirname, '../preload/index.js')
      }
    })

    loadPage(win, '/start')

    win.webContents.on('did-finish-load', () => {
      this.open(win, 'start')
    })

    win.on('ready-to-show', () => {
      win.show()
      win.maximize()
    })

    return this.success()
  }
}
