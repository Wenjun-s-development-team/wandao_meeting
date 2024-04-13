import process from 'node:process'
import { clipboard, contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const ipcInvoke = {
  clipboard,
  windows: (method: string, args: string) => ipcRenderer.invoke('windows', method, args),
  system: (method: string, args: string) => ipcRenderer.invoke('system', method, args),
  event: (callback: (event: Electron.IpcRendererEvent, type: string, args: string) => void) =>
    ipcRenderer.on('event', callback)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('ipcInvoke', ipcInvoke)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error (define in dts)
  window.electron = electronAPI
  // @ts-expect-error (define in dts)
  window.ipcInvoke = ipcInvoke
}
