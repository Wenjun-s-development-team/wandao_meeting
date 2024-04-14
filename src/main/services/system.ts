import { desktopCapturer, ipcMain, systemPreferences } from 'electron'
import { Service } from './service'

async function applyDeviceAccessPrivilege() {
  const cameraPrivilege = systemPreferences.getMediaAccessStatus('camera')
  console.log(`相机访问特权: ${cameraPrivilege}`)
  if (cameraPrivilege !== 'granted') {
    await systemPreferences.askForMediaAccess('camera')
  }
  const microphonePrivilege = systemPreferences.getMediaAccessStatus('microphone')
  console.log(`麦克风访问特权: ${microphonePrivilege}`)
  if (microphonePrivilege !== 'granted') {
    await systemPreferences.askForMediaAccess('microphone')
  }
  const screenPrivilege = systemPreferences.getMediaAccessStatus('screen')
  console.log(`屏幕访问特权: ${screenPrivilege}`)
}

export class SystemService extends Service {
  constructor() {
    super()
    console.log('SystemService constructor')
  }

  start() {
    ipcMain.handle('system', this.methodHandler.bind(this))
  }

  async getSources() {
    await applyDeviceAccessPrivilege()
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      fetchWindowIcons: true,
      thumbnailSize: { width: 1024, height: 1024 },
    })
    return this.success({ sources })
  }
}

export const useSystemService = new SystemService()
