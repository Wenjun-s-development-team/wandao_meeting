import { Service } from './service'
import { ipcMain, desktopCapturer, systemPreferences } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'

async function checkAndApplyDeviceAccessPrivilege() {
  const cameraPrivilege = systemPreferences.getMediaAccessStatus('camera')
  console.log(`checkAndApplyDeviceAccessPrivilege before apply cameraPrivilege: ${cameraPrivilege}`)
  if (cameraPrivilege !== 'granted') {
    await systemPreferences.askForMediaAccess('camera')
  }
  const micPrivilege = systemPreferences.getMediaAccessStatus('microphone')
  console.log(`checkAndApplyDeviceAccessPrivilege before apply micPrivilege: ${micPrivilege}`)
  if (micPrivilege !== 'granted') {
    await systemPreferences.askForMediaAccess('microphone')
  }
  const screenPrivilege = systemPreferences.getMediaAccessStatus('screen')
  console.log(`checkAndApplyDeviceAccessPrivilege before apply screenPrivilege: ${screenPrivilege}`)
}

export class SystemService extends Service {
  constructor() {
    super()
    console.log('SystemService constructor')
  }

  start() {
    ipcMain.handle('system', this.methodHandler.bind(this))
    checkAndApplyDeviceAccessPrivilege()
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

  async getSources() {
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] })
    return this.success({ data: sources })
  }
}

export const useSystemService = new SystemService()
