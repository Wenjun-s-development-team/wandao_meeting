import { storeToRefs } from 'pinia'
import type { Client } from './client'

import { useWebrtcStore } from '@/store'

const webrtcStore = useWebrtcStore()
const {
  local,
  remotePeers,
} = storeToRefs(webrtcStore)

export class Microphone {
  scriptProcessor: null | ScriptProcessorNode = null
  client: Client | undefined
  localVolume: HTMLElement | undefined

  constructor(client?: Client, localVolume?: HTMLElement) {
    this.client = client
    this.localVolume = localVolume
  }

  async getMicrophoneVolumeIndicator(stream: MediaStream) {
    if (this.client?.mediaServer.hasAudioTrack(stream)) {
      this.stopMicrophoneProcessing()
      console.log('Start microphone volume indicator for audio track', stream.getAudioTracks()[0])
      const audioContext = new window.AudioContext()
      const microphone = audioContext.createMediaStreamSource(stream)
      this.scriptProcessor = audioContext.createScriptProcessor(1024, 1, 1)
      this.scriptProcessor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer.getChannelData(0)
        let sum = 0
        for (let i = 0; i < inputBuffer.length; i++) {
          sum += inputBuffer[i] * inputBuffer[i]
        }
        const rms = Math.sqrt(sum / inputBuffer.length)
        const volume = Math.max(0, Math.min(1, rms * 10))
        const finalVolume = Math.round(volume * 100)
        if (local.value.audioStatus && finalVolume > 10) {
          const config = {
            type: 'micVolume',
            userId: local.value.userId,
            volume: finalVolume,
          }
          this.updateVolume(config)
          this.client?.chatServer.sendToDataChannel(config)
        }
        this.updateVolumeIndicator(volume)
      }
      microphone.connect(this.scriptProcessor)
      this.scriptProcessor.connect(audioContext.destination)
    } else {
      console.warn('Microphone volume indicator not supported for this browser')
    }
  }

  stopMicrophoneProcessing() {
    console.log('Stop microphone volume indicator')
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect()
      this.scriptProcessor = null
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

  updateVolume(data: KeyValue) {
    if (local.value.userId === data.userId) {
      local.value.volume = data.volume
    } else if (remotePeers[data.userId]) {
      remotePeers[data.userId].volume = data.volume
    }
  }
}
