import type { Client } from './client'

export class Microphone {
  scriptProcessor: null | ScriptProcessorNode = null
  client: Client | undefined
  // pitchBar: HTMLElement | null
  localVolume: HTMLElement | null

  constructor(client?: Client) {
    this.client = client
    this.localVolume = document.getElementById('localVolume')
  }

  getMicrophoneVolumeIndicator(stream: MediaStream) {
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
        if (this.client?.mediaServer.audioStatus && finalVolume > 10) {
          const config = {
            type: 'micVolume',
            userId: this.client.userId,
            volume: finalVolume,
          }
          this.updateVolume(config)
          this.client.chatServer.sendToDataChannel(config)
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
    console.log(data)
    // if (!isAudioPitchBar || !myPitchBar) {
    //   return
    // }

    // const volume = data.volume
    // if (volume > 50) {
    //   myPitchBar.style.backgroundColor = 'orange'
    // }
    // myPitchBar.style.height = `${volume}%`
    // // myVideoWrap.classList.toggle('speaking');
    // setTimeout(() => {
    //   myPitchBar.style.backgroundColor = '#19bb5c'
    //   myPitchBar.style.height = '0%'
    //   // myVideoWrap.classList.toggle('speaking');
    // }, 100)
  }
}
