import { storeToRefs } from 'pinia'
import type { Client } from '.'

import { useWebrtcStore } from '@/store'

const webrtcStore = useWebrtcStore()
const {
  local,
  remotePeers,
} = storeToRefs(webrtcStore)

export class MicrophoneVolumeIndicator {
  declare node: AudioWorkletNode
  declare audioContext: AudioContext
  declare sourceNode: MediaStreamAudioSourceNode | null

  client: Client | undefined
  localVolume: HTMLElement | undefined

  constructor(client?: Client, localVolume?: HTMLElement) {
    this.client = client
    this.localVolume = localVolume
  }

  async start(stream: MediaStream) {
    if (this.client?.mediaServer.hasAudioTrack(stream)) {
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
          this.client?.chatServer.sendToDataChannel(config)
        }

        this.updateVolumeIndicator(finalVolume)
      }

      this.sourceNode.connect(this.node)
    } else {
      // console.warn('Microphone volume indicator not supported for this browser')
    }
  }

  stopMicrophoneProcessing() {
    console.log('Stop microphone volume indicator')
    if (this.sourceNode) {
      // 取消 onmessage 监听
      this.sourceNode?.disconnect()
      this.sourceNode = null
    }
  }

  updateVolume(data: KeyValue) {
    if (local.value.userId === data.userId) {
      local.value.finalVolume = data.volume
    } else if (remotePeers[data.userId]) {
      remotePeers[data.userId].finalVolume = data.volume
    }
  }

  updateVolumeIndicator(volume: number) {
    if (this.localVolume) {
      const childElements = this.localVolume.querySelectorAll('.volume-bar')
      const activeBars = Math.ceil(volume * childElements.length)
      childElements.forEach((bar, index) => {
        bar.classList.toggle('active', index < activeBars)
      })
    }
  }
}

export function useVolumeIndicator(client?: Client, localVolume?: HTMLElement) {
  return new MicrophoneVolumeIndicator(client, localVolume)
}
