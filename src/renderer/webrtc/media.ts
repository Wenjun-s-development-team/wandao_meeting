import { storeToRefs } from 'pinia'
import type { Client } from './client'
import { playSound } from '@/utils'
import { useWebrtcStore } from '@/store'

const webrtcStore = useWebrtcStore()
const {
  useVideo,
  useAudio,
  useScreen,
  screenId,
  videoInputDeviceId,
  audioInputDeviceId,
  audioOutputDeviceId,
  videoInputDevices,
  audioInputDevices,
  audioOutputDevices,
  remoteVideo,
  remoteAudio,
} = storeToRefs(webrtcStore)

/**
 * 媒体
 */
export class MediaServer {
  client: Client | undefined
  // videoFps = reactive([5, 15, 30, 60]) // 每秒帧数
  declare videoElement: HTMLVideoElement
  declare audioElement: HTMLAudioElement
  declare volumeElement: HTMLDivElement | undefined

  declare localVideoStream: MediaStream
  declare localAudioStream: MediaStream

  declare remoteAvatarImage: HTMLImageElement
  declare remoteVideoElement: HTMLVideoElement
  declare remoteAudioElement: HTMLAudioElement

  constructor(client?: Client) {
    this.client = client
  }

  init(videoElement: HTMLVideoElement, audioElement: HTMLAudioElement, volumeElement?: HTMLDivElement) {
    this.videoElement = videoElement
    this.audioElement = audioElement
    this.volumeElement = volumeElement
    remoteVideo.value = []
    remoteAudio.value = []
    return this
  }

  async start() {
    const { localVideoStream, localAudioStream } = this
    if (!localVideoStream || !localAudioStream) {
      await this.initEnumerateDevices()
      await this.setupLocalVideo()
      await this.setupLocalAudio()
      if (!toValue(useVideo) || (!toValue(useVideo) && !toValue(useAudio))) {
        await this.loadLocalMedia(new MediaStream(), 'video')
      }
    }
  }

  async initEnumerateDevices() {
    console.log('05. 获取视频和音频设备')
    const devices = await window.navigator.mediaDevices.enumerateDevices()

    videoInputDevices.value = devices.filter(i => i.kind === 'videoinput')
    audioInputDevices.value = devices.filter(i => i.kind === 'audioinput')
    audioOutputDevices.value = devices.filter(i => i.kind === 'audiooutput')

    videoInputDeviceId.value = videoInputDevices.value[0].deviceId
    audioInputDeviceId.value = audioInputDevices.value[0].deviceId
    audioOutputDeviceId.value = audioOutputDevices.value[0].deviceId
  }

  async setupLocalVideo(constraints?: KeyValue) {
    if (!toValue(useVideo) && !toValue(useScreen)) {
      return
    }

    console.log('📹 请求访问视频输入设备')

    const videoConstraints = toValue(useVideo) || toValue(useScreen)
      ? constraints || this.getVideoConstraints('default')
      : false

    /**
     * 更新本地媒体流
     * @param {MediaStream} stream
     */
    const updateLocalVideoMediaStream = async (stream: MediaStream) => {
      if (stream) {
        this.localVideoStream = stream
        await this.loadLocalMedia(stream, 'video')
        console.log('9. 📹 授予对视频设备的访问权限')
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints })
      await updateLocalVideoMediaStream(stream)
    } catch (err) {
      console.error('访问视频设备时出错', err)
      console.warn('回退到默认约束')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        await updateLocalVideoMediaStream(stream)
      } catch (fallbackErr) {
        console.error('访问具有默认约束的视频设备时出错', fallbackErr)
        playSound('alert')
      }
    }
  }

  async setupLocalAudio(constraints?: KeyValue) {
    if (!toValue(useAudio)) {
      return
    }

    console.log('🎤 请求访问音频输入设备')

    const audioConstraints = toValue(useAudio) ? constraints || this.getAudioConstraints() : false

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
      if (stream) {
        await this.loadLocalMedia(stream, 'audio')
        if (toValue(useAudio)) {
          this.localAudioStream = stream
          // 麦克风音量测试
          // await getMicrophoneVolumeIndicator(stream)
          console.log('10. 🎤 授予对音频设备的访问权限')
        }
      }
    } catch (err) {
      console.log('audio', err)
      playSound('alert')
    }
  }

  async loadLocalMedia(stream: MediaStream, kind: string) {
    if (stream) {
      console.log('加载本地媒体流轨道', stream.getTracks())
    }

    if (kind === 'video') {
      console.log('设置本地视频流')
      this.logStreamInfo('localVideoMediaStream', stream)
      this.attachMediaStream(this.videoElement, stream)
    } else if (kind === 'audio') {
      console.log('设置本地音频流')
      this.logStreamInfo('localAudioMediaStream', stream)
      this.attachMediaStream(this.audioElement, stream)
    }
  }

  /**
   * 加载远程媒体流
   * @param {MediaStream} stream audio ｜ video媒体流
   * @param {object} peers 同一房间所有 RTCPeer 信息
   * @param {string} userId socket.id
   */
  async loadRemoteMediaStream(stream: MediaStream, peers: KeyValue, userId: string, kind: string) {
    const room = peers[userId]
    console.log('REMOTE PEER INFO', room)

    if (stream) {
      console.log(`LOAD REMOTE MEDIA STREAM TRACKS - roomName:[${room.roomName}]`, stream.getTracks())
    }

    if (kind === 'video') {
      console.log('📹 SETUP REMOTE VIDEO STREAM', stream.id)
      remoteVideo.value.push({ userId, stream, room, kind })
    } else if (kind === 'audio') {
      console.log('🔈 SETUP REMOTE AUDIO STREAM', stream.id)
      remoteAudio.value.push({ userId, stream, room, kind })
    }
  }

  cleanRemoteMedia() {
    remoteVideo.value = []
    remoteAudio.value = []
  }

  // 监听
  listen() {
    // 屏幕共享、设备切换 - 需重新创建 stream
    watch([useScreen, videoInputDeviceId, audioInputDeviceId], async () => {
      if (useScreen.value && screenId.value) {
        // 切换到屏幕共享
        await this.setupLocalVideo({
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: screenId.value,
          },
        })
      } else {
        // 切换到视频输入设备
        await this.setupLocalVideo({
          deviceId: videoInputDeviceId.value,
          ...this.getVideoConstraints('default'),
        })
      }
      // 切换到音频输入设备
      await this.setupLocalAudio({
        deviceId: audioInputDeviceId.value,
        ...this.getAudioConstraints(),
      })
    }, { immediate: true })

    // 监听 音频视频 启用/禁用 - 不需重新创建 stream
    watch([useVideo, useAudio], () => {
      this.setVideoTracks(useVideo.value)
      this.setAudioTracks(useAudio.value)
    })
  }

  logStreamInfo(name: string, stream: MediaStream) {
    if ((toValue(useVideo) || toValue(useScreen)) && this.hasVideoTrack(stream)) {
      console.log(name, {
        video: {
          label: stream.getVideoTracks()[0].label,
          settings: stream.getVideoTracks()[0].getSettings(),
        },
      })
    }
    if (toValue(useAudio) && this.hasAudioTrack(stream)) {
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
    console.log('成功加载媒体流', stream.getTracks())
  }

  // 设备本地视频开/关
  setVideoTracks(enabled: boolean) {
    if (this.localVideoStream) {
      this.localVideoStream.getTracks().forEach((track) => {
        track.enabled = enabled
      })
    }
  }

  // 设备本地音频开/关
  setAudioTracks(enabled: boolean) {
    if (this.localAudioStream) {
      this.localAudioStream.getTracks().forEach((track) => {
        track.enabled = enabled
      })
    }
  }

  /**
   * onTrack 轨道添加到 P2P 连接事件
   * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/ontrack
   * @param {string} userId socket.id
   * @param {KeyValue} peers 同一房间所有 RTCPeer 信息
   */
  async handleOnTrack(userId: string, peers: KeyValue) {
    if (this.client) {
      console.log('[ON TRACK] - userId', { userId })

      this.client.peerConnections[userId].ontrack = (event) => {
        const { remoteVideoElement, remoteAudioElement } = this
        // remoteAvatarImage

        const peerInfo = peers[userId]
        const { roomName } = peerInfo
        const { kind } = event.track

        console.log('[ON TRACK] - info', { userId, roomName, kind })

        if (event.streams && event.streams[0]) {
          console.log('[ON TRACK] - peers', peers)

          switch (kind) {
            case 'video':
              remoteVideoElement
                ? this.attachMediaStream(remoteVideoElement, event.streams[0])
                : this.loadRemoteMediaStream(event.streams[0], peers, userId, kind)
              break
            case 'audio':
              remoteAudioElement
                ? this.attachMediaStream(remoteAudioElement, event.streams[0])
                : this.loadRemoteMediaStream(event.streams[0], peers, userId, kind)
              break
            default:
              break
          }
        } else {
          console.log('[ON TRACK] - SCREEN SHARING', { userId, roomName, kind })
          const inboundStream = new MediaStream([event.track])
          this.attachMediaStream(remoteVideoElement, inboundStream)
        }
      }
    }
  }

  /**
   * 将本地音视频流添加到P2P连接中
   * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addTrack
   * @param {string} userId socket.id
   */
  async handleAddTracks(userId: string) {
    if (this.client) {
      const roomName = this.client.allPeers[userId].roomName
      const { localVideoStream, localAudioStream } = this
      const videoTrack = localVideoStream && localVideoStream.getVideoTracks()[0]
      const audioTrack = localAudioStream && localAudioStream.getAudioTracks()[0]

      console.log('handleAddTracks', { videoTrack, audioTrack })

      if (videoTrack) {
        console.log(`[ADD VIDEO TRACK] to Peer Name [${roomName}]`)
        this.client.peerConnections[userId].addTrack(videoTrack, localVideoStream)
      }

      if (audioTrack) {
        console.log(`[ADD AUDIO TRACK] to Peer Name [${roomName}]`)
        this.client.peerConnections[userId].addTrack(audioTrack, localAudioStream)
      }
    }
  }

  hasAudioTrack(mediaStream: MediaStream) {
    if (!mediaStream) {
      return false
    }
    const audioTracks = mediaStream.getAudioTracks()
    return audioTracks.length > 0
  }

  hasVideoTrack(mediaStream: MediaStream) {
    if (!mediaStream) {
      return false
    }
    const videoTracks = mediaStream.getVideoTracks()
    return videoTracks.length > 0
  }

  getVideoConstraints(
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

  getAudioConstraints() {
    const constraints = {
      autoGainControl: true, // 自动增益
      echoCancellation: true, // 消除回声
      noiseSuppression: true, // 噪声抑制
      sampleRate: 48000, // 采样率 48000 | 44100
      sampleSize: 32, // 采样大小 16 ｜ 32
      channelCount: 2, // 通道数 1(mono = 单声道) ｜ 2(stereo = 立体声)
      latency: 50, // 延迟ms min="10" max="1000" value="50" step="10"
      volume: 100 / 100, // 音量 min="0" max="100" value="100" step="10"
    }
    console.log('Audio constraints', constraints)
    return constraints
  }
}
