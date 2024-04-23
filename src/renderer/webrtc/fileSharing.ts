import type { Client } from './client'

/**
 * 文件
 */
export class FileSharingServer {
  client: Client

  fileDataChannels: { [key: string]: RTCDataChannel } = {}

  constructor(client: Client) {
    this.client = client
  }

  async createDataChannel(userId: number) {
    this.fileDataChannels[userId] = this.client.peerConnections[userId].createDataChannel('file_sharing_channel')
    this.fileDataChannels[userId].binaryType = 'arraybuffer'
    this.fileDataChannels[userId].onopen = (event) => {
      console.log('fileDataChannels created', event)
    }
  }

  removeDataChannel(userId: number) {
    delete this.fileDataChannels[userId]
  }

  cleanDataChannel() {
    this.fileDataChannels = {}
  }

  onMessage(dataFile: ArrayBuffer | Blob) {
    try {
      if (dataFile instanceof ArrayBuffer && dataFile.byteLength !== 0) {
        this.handleFileSharing(dataFile)
      } else {
        if (dataFile instanceof Blob && dataFile.size !== 0) {
          this.blobToArrayBuffer(dataFile).then((arrayBuffer) => {
            this.handleFileSharing(arrayBuffer)
          }).catch((error) => {
            console.error('file_sharing_channel', error)
          })
        }
      }
    } catch (err) {
      console.error('file_sharing_channel', err)
    }
  }

  handleFileSharing(dataFile: string | ArrayBuffer | null) {
    console.log(dataFile)
  }

  blobToArrayBuffer(blob: Blob): Promise<string | ArrayBuffer | null> {
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
