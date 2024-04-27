import { Client } from './client'

/**
 * 文件
 */
export class FileServer {
  static fileDataChannels: { [key: string]: RTCDataChannel } = {}

  static async createDataChannel(userId: number) {
    FileServer.fileDataChannels[userId] = Client.peerConnections[userId].createDataChannel('file_sharing_channel')
    FileServer.fileDataChannels[userId].binaryType = 'arraybuffer'
    FileServer.fileDataChannels[userId].onopen = (event) => {
      console.log('fileDataChannels created', event)
    }
  }

  static removeDataChannel(userId: number) {
    delete FileServer.fileDataChannels[userId]
  }

  static cleanDataChannel() {
    FileServer.fileDataChannels = {}
  }

  static onMessage(dataFile: ArrayBuffer | Blob) {
    try {
      if (dataFile instanceof ArrayBuffer && dataFile.byteLength !== 0) {
        FileServer.handleFileSharing(dataFile)
      } else {
        if (dataFile instanceof Blob && dataFile.size !== 0) {
          FileServer.blobToArrayBuffer(dataFile).then((arrayBuffer) => {
            FileServer.handleFileSharing(arrayBuffer)
          }).catch((error) => {
            console.error('file_sharing_channel', error)
          })
        }
      }
    } catch (err) {
      console.error('file_sharing_channel', err)
    }
  }

  static handleFileSharing(dataFile: string | ArrayBuffer | null) {
    console.log(dataFile)
  }

  static blobToArrayBuffer(blob: Blob): Promise<string | ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve(reader.result)
      }
      reader.onerror = () => {
        reject(new Error('Error reading Blob as ArrayBuffer'))
      }
      reader.readAsArrayBuffer(blob)
    })
  }
}
