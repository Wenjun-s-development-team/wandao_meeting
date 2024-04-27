import { storeToRefs } from 'pinia'
import { ChatServer, MediaServer } from '.'

import { useWebrtcStore } from '@/store'

const webrtcStore = useWebrtcStore()
const {
  local,
  remotePeers,
} = storeToRefs(webrtcStore)

export class GetMicrophoneVolumeIndicator {
  static declare node: AudioWorkletNode
  static declare audioContext: AudioContext
  static declare sourceNode: MediaStreamAudioSourceNode | null

  static async start(stream: MediaStream) {
    if (MediaServer.hasAudioTrack(stream)) {
      this.stopMicrophoneProcessing()
      this.audioContext = new AudioContext()
      await this.audioContext.audioWorklet.addModule('../assets/vumeter.js')
      this.node = new AudioWorkletNode(this.audioContext, 'vumeter')

      console.log('Start microphone volume indicator for audio track', stream.getAudioTracks()[0])

      this.sourceNode = this.audioContext.createMediaStreamSource(stream)

      this.node.port.onmessage = (event) => {
        const finalVolume = Math.round((event.data.volume || 0) * 200)
        if (local.value.audioStatus && finalVolume > 0) {
          const config = {
            type: 'micVolume',
            userId: local.value.userId,
            volume: Math.min(100, finalVolume),
          }

          this.updateVolume(config)
          ChatServer.sendToDataChannel(config)
        }

        this.updateVolumeIndicator(finalVolume)
      }

      this.sourceNode.connect(this.node)
    } else {
      // console.warn('Microphone volume indicator not supported for this browser')
    }
  }

  static stopMicrophoneProcessing() {
    console.log('Stop microphone volume indicator')
    if (this.sourceNode) {
      // 取消 onmessage 监听
      this.sourceNode?.disconnect()
      this.sourceNode = null
    }
  }

  static updateVolume(data: KeyValue) {
    if (local.value.userId === data.userId) {
      local.value.finalVolume = data.volume
    } else if (remotePeers[data.userId]) {
      remotePeers[data.userId].finalVolume = data.volume
    }
  }

  static updateVolumeIndicator(volume: number) {
    if (MediaServer.volumeElement) {
      const childElements = MediaServer.volumeElement.querySelectorAll('.volume-bar')
      const activeBars = Math.ceil(volume * childElements.length)
      childElements.forEach((bar, index) => {
        bar.classList.toggle('active', index < activeBars)
      })
    }
  }
}
