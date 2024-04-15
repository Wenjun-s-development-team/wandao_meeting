import { type Socket, io } from 'socket.io-client'
import { storeToRefs } from 'pinia'
import { hasAudioTrack, hasVideoTrack, playSound } from './media'
import { useWebrtcStore } from '@/store'

const webrtcStore = useWebrtcStore()
const { useScreen, useVideo, useAudio } = storeToRefs(webrtcStore)

export class Client {
  declare roomId: string
  declare socket: Socket
  declare localVideoStream: MediaStream
  declare localAudioStream: MediaStream

  declare videoInputDevices: MediaDeviceInfo[]
  declare audioInputDevices: MediaDeviceInfo[]
  declare audioOutputDevices: MediaDeviceInfo[]

  declare videoElement: HTMLVideoElement
  declare audioElement: HTMLAudioElement
  declare volumeElement: HTMLDivElement

  constructor(videoElement: HTMLVideoElement, audioElement: HTMLAudioElement, volumeElement: HTMLDivElement) {
    this.videoElement = videoElement
    this.audioElement = audioElement
    this.volumeElement = volumeElement

    console.log('01. 连接到信令服务器')
  }

  start() {
    this.socket = io('ws://localhost:8081', {
      // path: '/p2p',
      transports: ['websocket'],
    })

    const transport = this.socket.io.engine.transport.name
    console.log('02. Connection transport', transport)

    this.socket.on('connect', () => this.handleConnect())
  }

  async handleConnect() {
    console.log('03. 信令服务器连接成功')
    const { localVideoStream, localAudioStream } = this

    const peerId = this.socket.id
    console.log(`04. My peer id [ ${peerId} ]`)

    if (localVideoStream && localAudioStream) {
      await this.joinToChannel()
    } else {
      await this.initEnumerateDevices()
      await this.setupLocalVideoMedia()
      await this.setupLocalAudioMedia()
      if (!toValue(useVideo) || (!toValue(useVideo) && !toValue(useAudio))) {
        await this.loadLocalMedia(new MediaStream(), 'video')
      }
    }
  }

  sendToServer(msg: string, config = {}) {
    this.socket.emit(msg, config)
  }

  async joinToChannel() {
    console.log('12. join to channel', this.roomId)
    this.sendToServer('join', {
      roomId: this.roomId,
    })
  }

  async initEnumerateDevices() {
    console.log('05. init Enumerate Video and Audio Devices')

    const { videoInputs, audioInputs, audioOutputs } = useDevicesList({ requestPermissions: true })

    this.videoInputDevices = toValue(videoInputs)
    this.audioInputDevices = toValue(audioInputs)
    this.audioOutputDevices = toValue(audioOutputs)
  }

  async setupLocalVideoMedia() {
    if (!toValue(useVideo) || this.localVideoStream) {
      return
    }

    console.log('Requesting access to video inputs')

    const videoConstraints = toValue(useVideo) ? await this.getVideoConstraints('default') : false

    /**
     * Update Local Media Stream
     * @param {MediaStream} stream
     */
    const updateLocalVideoMediaStream = async (stream: MediaStream) => {
      if (stream) {
        this.localVideoStream = stream
        await this.loadLocalMedia(stream, 'video')
        console.log('Access granted to video device')
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints })
      await updateLocalVideoMediaStream(stream)
    } catch (err) {
      console.error('Error accessing video device', err)
      console.warn('Fallback to default constraints')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        await updateLocalVideoMediaStream(stream)
      } catch (fallbackErr) {
        console.error('Error accessing video device with default constraints', fallbackErr)
        playSound('alert')
      }
    }
  }

  /**
   * Setup local audio media. Ask the user for permission to use the computer's microphone,
   * and attach it to an <audio> tag if access is granted.
   * https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
   */
  async setupLocalAudioMedia() {
    if (!toValue(useAudio) || this.localAudioStream) {
      return
    }

    console.log('Requesting access to audio inputs')

    const audioConstraints = toValue(useAudio) ? await this.getAudioConstraints() : false

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
      if (stream) {
        await this.loadLocalMedia(stream, 'audio')
        if (toValue(useAudio)) {
          this.localAudioStream = stream
          // await getMicrophoneVolumeIndicator(stream)
          console.log('10. Access granted to audio device')
        }
      }
    } catch (err) {
      console.log('audio', err)
      playSound('alert')
    }
  }

  async stopTracks(stream: MediaStream) {
    stream.getTracks().forEach((track) => {
      track.stop()
    })
  }

  async getVideoConstraints(
    quality:
      | 'default'
      | 'qvgaVideo'
      | 'vgaVideo'
      | 'hdVideo'
      | 'fhdVideo'
      | '2kVideo'
      | '4kVideo' = 'default',
    frameRate: FrameRate = { ideal: 30 },
    forceFps: boolean = false,
  ) {
    let constraints = {}

    switch (quality) {
      case 'default':
        if (forceFps) {
          constraints = {
            width: { ideal: 3840 },
            height: { ideal: 2160 },
            frameRate: { ideal: 60 },
          }
        } else {
          constraints = {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          }
        }
        break
      case 'qvgaVideo':
        constraints = {
          width: { exact: 320 },
          height: { exact: 240 },
          frameRate,
        }
        break
      case 'vgaVideo':
        constraints = {
          width: { exact: 640 },
          height: { exact: 480 },
          frameRate,
        }
        break
      case 'hdVideo':
        constraints = {
          width: { exact: 1280 },
          height: { exact: 720 },
          frameRate,
        }
        break
      case 'fhdVideo':
        constraints = {
          width: { exact: 1920 },
          height: { exact: 1080 },
          frameRate,
        }
        break
      case '2kVideo':
        constraints = {
          width: { exact: 2560 },
          height: { exact: 1440 },
          frameRate,
        }
        break
      case '4kVideo':
        constraints = {
          width: { exact: 3840 },
          height: { exact: 2160 },
          frameRate,
        }
        break
      default:
        break
    }
    console.log('Video constraints', constraints)
    return constraints
  }

  async getAudioConstraints() {
    const constraints = {
      // 自动增益
      autoGainControl: true,
      // 消除回声
      echoCancellation: true,
      // 噪声抑制
      noiseSuppression: true,
      // 采样率 48000 | 44100
      sampleRate: 48000,
      // 采样大小 16 ｜ 32
      sampleSize: 32,
      // 通道数 1(mono = 单声道) ｜ 2(stereo = 立体声)
      channelCount: 2,
      // 延迟 ms min="10" max="1000" value="50" step="10"
      latency: 50,
      // 体积 min="0" max="100" value="100" step="10"
      volume: 100 / 100,
    }
    console.log('Audio constraints', constraints)
    return constraints
  }

  async loadLocalMedia(stream: MediaStream, kind: string) {
    if (stream) {
      console.log('LOAD LOCAL MEDIA STREAM TRACKS', stream.getTracks())
    }

    if (kind === 'video') {
      console.log('SETUP LOCAL VIDEO STREAM')
      this.logStreamSettingsInfo('localVideoMediaStream', stream)
      this.attachMediaStream(this.videoElement, stream)
    } else if (kind === 'audio') {
      console.log('SETUP LOCAL AUDIO STREAM')
      this.logStreamSettingsInfo('localAudioMediaStream', stream)
      this.attachMediaStream(this.audioElement, stream)
    }
  }

  logStreamSettingsInfo(name: string, stream: MediaStream) {
    if ((toValue(useVideo) || toValue(useScreen)) && hasVideoTrack(stream)) {
      console.log(name, {
        video: {
          label: stream.getVideoTracks()[0].label,
          settings: stream.getVideoTracks()[0].getSettings(),
        },
      })
    }
    if (toValue(useAudio) && hasAudioTrack(stream)) {
      console.log(name, {
        audio: {
          label: stream.getAudioTracks()[0].label,
          settings: stream.getAudioTracks()[0].getSettings(),
        },
      })
    }
  }

  attachMediaStream(element: HTMLVideoElement | HTMLAudioElement, stream: MediaStream) {
    if (!element || !stream) {
      return
    }
    element.srcObject = stream
    console.log('Success, media stream attached', stream.getTracks())
  }
}
