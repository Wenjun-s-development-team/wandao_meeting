import { storeToRefs } from 'pinia'
import type { Client } from './client'
import { type MicrophoneVolumeIndicator, useVolumeIndicator } from './useVolume'
import { playSound } from '@/utils'
import { useWebrtcStore } from '@/store'

const webrtcStore = useWebrtcStore()
const {
  local,
  screenId,
  pinnedId,
  remotePeers,
  videoInputDeviceId,
  audioInputDeviceId,
  audioOutputDeviceId,
  videoInputDevices,
  audioInputDevices,
  audioOutputDevices,
  isEnumerateDevices,
} = storeToRefs(webrtcStore)

/**
 * 媒体
 */
export class MediaServer {
  client: Client | undefined

  declare volumeIndicator: MicrophoneVolumeIndicator

  declare videoElement: HTMLVideoElement
  declare audioElement: HTMLAudioElement
  declare volumeElement: HTMLDivElement | undefined

  declare localVideoStream: MediaStream
  declare localAudioStream: MediaStream

  declare remoteVideoElement: HTMLVideoElement

  localVideoStatusBefore: boolean = false

  // 视频设置
  videoMaxFrameRate: number = 60 // 每秒帧数 5, 15, 30, 60
  forceCamMaxResolutionAndFps: boolean = false

  // 音频设置
  sinkId = 'sinkId' in HTMLMediaElement.prototype
  autoGainControl: boolean = true // 自动增益
  echoCancellation: boolean = true // 消除回声
  noiseSuppression: boolean = true // 噪声抑制
  sampleRate: number = 48000 // 采样率 48000 | 44100
  sampleSize: number = 32 // 采样大小 16 ｜ 32
  channelCount: number = 2 // 通道数 1(mono = 单声道) ｜ 2(stereo = 立体声)
  latency: number = 50 // 延迟ms min="10" max="1000" value="50" step="10"
  volume: number = 1 // 音量 min="0" max="100" value="100" step="10"

  constructor(client?: Client) {
    this.client = client
  }

  init(videoElement: HTMLVideoElement, audioElement: HTMLAudioElement, volumeElement?: HTMLDivElement) {
    remotePeers.value = {}
    this.videoElement = videoElement
    this.audioElement = audioElement
    this.volumeElement = volumeElement

    return this
  }

  async start() {
    const { localVideoStream, localAudioStream } = this
    // 麦克风音量
    this.volumeIndicator = useVolumeIndicator(this.client, this.volumeElement)
    if (!localVideoStream || !localAudioStream) {
      await this.initEnumerateDevices()
      await this.setupLocalVideo()
      await this.setupLocalAudio()
      if (!local.value.useVideo || (!local.value.useVideo && !local.value.useAudio)) {
        await this.loadLocalMedia(new MediaStream(), 'video')
      }
    }
  }

  async initEnumerateDevices() {
    console.log('05. 获取视频和音频设备')
    if (!isEnumerateDevices.value) {
      const devices = await window.navigator.mediaDevices.enumerateDevices()

      videoInputDevices.value = devices.filter(i => i.kind === 'videoinput')
      audioInputDevices.value = devices.filter(i => i.kind === 'audioinput')
      audioOutputDevices.value = devices.filter(i => i.kind === 'audiooutput')

      videoInputDeviceId.value = videoInputDevices.value[0].deviceId
      audioInputDeviceId.value = audioInputDevices.value[0].deviceId
      audioOutputDeviceId.value = audioOutputDevices.value[0].deviceId

      local.value.useVideo = videoInputDevices.value.length > 0
      local.value.useAudio = audioInputDevices.value.length > 0

      isEnumerateDevices.value = true
    }
  }

  async setupLocalVideo(toPeers?: boolean) {
    if (this.localVideoStream) {
      await this.stopVideoTracks(this.localVideoStream)
    }

    console.log('📹 请求访问视频输入设备')

    const videoConstraints = local.value.videoStatus || local.value.screenStatus
      ? await this.getVideoConstraints('default')
      : false

    try {
      this.localVideoStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints })
      await this.loadLocalMedia(this.localVideoStream, 'video')
      if (toPeers) {
        this.refreshStreamToPeers(this.localVideoStream)
      }
    } catch (err) {
      console.error('访问视频设备时出错, 加载默认媒体流', err)
      try {
        this.localVideoStream = await navigator.mediaDevices.getUserMedia({ video: true })
        await this.loadLocalMedia(this.localVideoStream, 'video')
        if (toPeers) {
          this.refreshStreamToPeers(this.localVideoStream)
        }
      } catch (fallbackErr) {
        console.error('访问默认约束的视频设备时出错', fallbackErr)
        playSound('alert')
      }
    }
  }

  async setupLocalAudio() {
    if (!local.value.useAudio || this.localAudioStream) {
      return
    }
    console.log('🎤 请求访问音频输入设备')
    const audioConstraints = await this.getAudioConstraints()
    try {
      this.localAudioStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
      await this.loadLocalMedia(this.localAudioStream, 'audio')
      await this.volumeIndicator.start(this.localAudioStream)
      console.log('10. 🎤 授予对音频设备的访问权限')
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

  logStreamInfo(name: string, stream: MediaStream) {
    if ((local.value.useVideo || local.value.screenStatus) && this.hasVideoTrack(stream)) {
      console.log(name, {
        video: {
          label: stream.getVideoTracks()[0].label,
          settings: stream.getVideoTracks()[0].getSettings(),
        },
      })
    }
    if (local.value.useAudio && this.hasAudioTrack(stream)) {
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

  /**
   * 加载远程媒体流
   * @param {MediaStream} stream audio ｜ video 媒体流
   * @param {object} peers 同一房间所有 RTCPeer 相关信息
   * @param {string} userId
   * @param {string} kind 媒体类型 video | audio
   */
  async loadRemoteMediaStream(stream: MediaStream, peers: KeyValue, userId: string, kind: string) {
    const peer = peers[userId]
    console.log('REMOTE PEER INFO', peer)

    if (stream) {
      console.log(`LOAD REMOTE MEDIA STREAM TRACKS - roomName:[${peer.roomName}]`, stream.getTracks())
    }

    if (!remotePeers.value[userId]) {
      remotePeers.value[userId] = { kind, userId, volume: 1, ...peer }
    } else {
      remotePeers.value[userId] = Object.assign({}, remotePeers.value[userId], { kind, userId, ...peer })
    }

    if (kind === 'video') {
      console.log('📹 SETUP REMOTE VIDEO STREAM', stream.id)
      remotePeers.value[userId].videoStream = stream
    } else if (kind === 'audio') {
      console.log('🔈 SETUP REMOTE AUDIO STREAM', stream.id)
      remotePeers.value[userId].audioStream = stream
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
        const { remoteVideoElement } = this

        const peer = peers[userId]
        const { roomName } = peer
        const { kind } = event.track

        console.log('%c[ON TRACK] - info', 'color:red;', { userId, roomName, kind })

        if (event.streams && event.streams[0]) {
          console.log('[ON TRACK] - peers', peers)

          switch (kind) {
            case 'video':
              this.loadRemoteMediaStream(event.streams[0], peers, userId, kind)
              break
            case 'audio':
              this.loadRemoteMediaStream(event.streams[0], peers, userId, kind)
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

  hasAudioTrack(stream: MediaStream) {
    if (!stream) {
      return false
    }
    const audioTracks = stream.getAudioTracks()
    return audioTracks.length > 0
  }

  hasVideoTrack(stream: MediaStream) {
    if (!stream) {
      return false
    }
    const videoTracks = stream.getVideoTracks()
    return videoTracks.length > 0
  }

  async stopTracks(stream: MediaStream) {
    stream.getTracks().forEach((track) => {
      track.stop()
    })
  }

  setLocalVideoOff() {
    if (!local.value.useVideo) {
      return
    }

    local.value.videoStatus = false
    this.localVideoStream.getVideoTracks()[0].enabled = local.value.videoStatus

    this.sendLocalVideoStatus(local.value.videoStatus)
    playSound('off')
  }

  setLocalAudioOff() {
    if (!local.value.audioStatus || !local.value.useAudio) {
      return
    }
    this.localAudioStream.getAudioTracks()[0].enabled = false
    this.sendLocalAudioStatus(local.value.audioStatus)
    playSound('off')
  }

  sendLocalVideoStatus(status: boolean) {
    console.log('send local video status', status)
    this.emitPeerStatus('video', status)
    playSound(status ? 'on' : 'off')
  }

  sendLocalAudioStatus(status: boolean) {
    console.log('send local audio status', status)
    this.emitPeerStatus('audio', status)
    status ? playSound('on') : playSound('off')
  }

  setPeerStatus(type: string, userId: number, status: boolean) {
    if (!['videoStatus', 'audioStatus', 'handStatus', 'recordStatus', 'privacyStatus'].includes(type)) {
      return
    }

    console.log('setPeerStatus:', { type, userId, status })

    if (local.value.userId === userId) {
      local.value[type] = status
    } else if (remotePeers.value[userId]) {
      remotePeers.value[userId][type] = status
    }

    if (['videoStatus', 'audioStatus'].includes(type)) {
      status ? playSound('on') : playSound('off')
    } else if (type === 'handStatus' && status) {
      playSound('raiseHand')
    }
  }

  async setLocalVideoStatusTrue() {
    if (local.value.videoStatus || !local.value.useVideo) {
      return
    }
    // Put video status already ON
    local.value.videoStatus = true
    this.localVideoStream.getVideoTracks()[0].enabled = local.value.videoStatus

    this.emitPeerStatus('video', local.value.videoStatus)
  }

  async stopLocalVideoTrack() {
    if (local.value.useVideo || !local.value.screenStatus) {
      const localVideoTrack = this.localVideoStream.getVideoTracks()[0]
      if (localVideoTrack) {
        console.log('stopLocalVideoTrack', localVideoTrack)
        localVideoTrack.stop()
      }
    }
  }

  async stopVideoTracks(stream: MediaStream) {
    if (!stream) {
      return
    }
    stream.getTracks().forEach((track) => {
      if (track.kind === 'video') {
        track.stop()
      }
    })
  }

  async refreshLocalStream(stream: MediaStream, localAudioTrackChange = false) {
    let { videoElement, audioElement, localVideoStream, localAudioStream } = this
    // enable video
    if (local.value.useVideo || local.value.screenStatus) {
      stream.getVideoTracks()[0].enabled = true
    }

    const tracksToInclude: MediaStreamTrack[] = []

    const videoTrack = this.hasVideoTrack(stream)
      ? stream.getVideoTracks()[0]
      : this.hasVideoTrack(localVideoStream) && localVideoStream.getVideoTracks()[0]

    const audioTrack
        = this.hasAudioTrack(stream) && localAudioTrackChange
          ? stream.getAudioTracks()[0]
          : this.hasAudioTrack(localAudioStream) && localAudioStream.getAudioTracks()[0]

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaStream
    if (local.value.useVideo || local.value.screenStatus) {
      console.log('刷新本地媒体流 VIDEO - AUDIO:', local.value.screenStatus)
      if (videoTrack) {
        tracksToInclude.push(videoTrack)
        localVideoStream = new MediaStream([videoTrack])
        this.attachMediaStream(videoElement, localVideoStream)
        this.logStreamInfo('refreshLocalStream-localVideoMediaStream', localVideoStream)
      }
      if (audioTrack) {
        tracksToInclude.push(audioTrack)
        localAudioStream = new MediaStream([audioTrack])
        this.attachMediaStream(audioElement, localAudioStream)
        await this.volumeIndicator.start(localAudioStream)
        this.logStreamInfo('refreshLocalStream-localAudioMediaStream', localAudioStream)
      }
    } else {
      console.log('Refresh my local media stream AUDIO')
      if (local.value.useAudio && audioTrack) {
        tracksToInclude.push(audioTrack)
        localAudioStream = new MediaStream([audioTrack])
        await this.volumeIndicator.start(localAudioStream)
        this.logStreamInfo('refreshLocalStream-localAudioMediaStream', localAudioStream)
      }
    }

    if (local.value.screenStatus) {
      // refresh video privacy mode on screen sharing
      local.value.privacyStatus = false
      this.setPeerStatus('privacyStatus', local.value.userId, local.value.privacyStatus)

      // on switchScreenSharing video stop from popup bar
      stream.getVideoTracks()[0].onended = () => {
        this.switchScreenSharing()
      }
    }

    // adapt video object fit on screen streaming
    videoElement.style.objectFit = local.value.screenStatus ? 'contain' : 'cover'
  }

  async refreshStreamToPeers(stream: MediaStream, localAudioTrackChange = false) {
    if (!this.client?.peerCount) {
      return
    }

    const { localVideoStream, localAudioStream } = this

    if (local.value.useAudio && localAudioTrackChange) {
      localAudioStream.getAudioTracks()[0].enabled = local.value.audioStatus
    }

    // Log peer connections and all peers
    console.log('PEER-CONNECTIONS', this.client.peerConnections)
    console.log('ALL-PEERS', this.client.allPeers)

    // Check if the passed stream has an audio track
    const streamHasAudioTrack = this.hasAudioTrack(stream)

    // Check if the passed stream has an video track
    const streamHasVideoTrack = this.hasVideoTrack(stream)

    // Check if the local stream has an audio track
    const localStreamHasAudioTrack = this.hasAudioTrack(localAudioStream)

    // Check if the local stream has an video track
    const localStreamHasVideoTrack = this.hasVideoTrack(localVideoStream)

    // Determine the audio stream to add to peers
    const audioStream = streamHasAudioTrack ? stream : localStreamHasAudioTrack && localAudioStream

    // Determine the audio track to replace to peers
    const audioTrack
        = streamHasAudioTrack && (localAudioTrackChange || local.value.screenStatus)
          ? stream.getAudioTracks()[0]
          : localStreamHasAudioTrack && localAudioStream.getAudioTracks()[0]

    // Determine the video stream to add to peers
    const videoStream = streamHasVideoTrack ? stream : localStreamHasVideoTrack && localVideoStream

    // Determine the video track to replace to peers
    const videoTracks = streamHasVideoTrack
      ? stream.getVideoTracks()[0]
      : localStreamHasVideoTrack && localVideoStream.getVideoTracks()[0]

    // Refresh my stream to connected peers except myself
    if (videoTracks) {
      for (const userId in this.client.peerConnections) {
        const roomName = this.client.allPeers[userId].roomName

        // Replace video track
        const videoSender = this.client.peerConnections[userId].getSenders().find(s => s.track && s.track.kind === 'video')

        if (local.value.useVideo && videoSender) {
          videoSender.replaceTrack(videoTracks)
          console.log('REPLACE VIDEO TRACK TO', { userId, roomName, video: videoTracks })
        } else {
          if (videoStream) {
            // Add video track if sender does not exist
            videoStream.getTracks().forEach(async (track) => {
              if (track.kind === 'video') {
                this.client?.peerConnections[userId].addTrack(track)
                await this.client?.handleCreateRTCOffer(Number(userId)) // https://groups.google.com/g/discuss-webrtc/c/Ky3wf_hg1l8?pli=1
                console.log('ADD VIDEO TRACK TO', { userId, roomName, video: track })
              }
            })
          }
        }

        // Replace audio track
        const audioSender = this.client.peerConnections[userId].getSenders().find(s => s.track && s.track.kind === 'audio')

        if (audioSender && audioTrack) {
          audioSender.replaceTrack(audioTrack)
          console.log('REPLACE AUDIO TRACK TO', { userId, roomName, audio: audioTrack })
        } else {
          if (audioStream) {
            // Add audio track if sender does not exist
            audioStream.getTracks().forEach(async (track) => {
              if (track.kind === 'audio') {
                this.client?.peerConnections[userId].addTrack(track)
                await this.client?.handleCreateRTCOffer(Number(userId))
                console.log('ADD AUDIO TRACK TO', { userId, roomName, audio: track })
              }
            })
          }
        }
      }
    }
  }

  async emitPeerStatus(action: string, status: boolean) {
    this.client?.sendToServer('peerStatus', {
      action,
      status,
      roomId: local.value.roomId,
      userId: local.value.userId,
    })
  }

  async emitPeerAction(action: string) {
    if (!this.client?.peerCount) {
      return
    }

    this.client?.sendToServer('peerAction', {
      action,
      roomId: local.value.roomId,
      userId: local.value.userId,
      peerVideo: local.value.useVideo,
      sendToAll: true,
    })
  }

  async getAudioVideoConstraints(): Promise<MediaStreamConstraints> {
    let videoConstraints: MediaTrackConstraints = {}
    let audioConstraints: MediaTrackConstraints = {}

    if (local.value.videoStatus) {
      videoConstraints = await this.getVideoConstraints('default')
    }
    if (local.value.audioStatus) {
      audioConstraints = await this.getAudioConstraints()
    }
    return {
      audio: local.value.screenStatus ? false : audioConstraints,
      video: videoConstraints,
    }
  }

  async getVideoConstraints(videoQuality: string = 'default'): Promise<MediaTrackConstraints> {
    if (local.value.screenStatus && screenId.value) {
      return {
        // eslint-disable-next-line ts/ban-ts-comment
        // @ts-expect-error
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: screenId.value,
        },
      }
    }

    let video: MediaTrackConstraints = {}
    const frameRate = this.videoMaxFrameRate
    switch (videoQuality) {
      case 'default':
        if (this.forceCamMaxResolutionAndFps) {
          // This will make the browser use the maximum resolution available as default, `up to 4K and 60fps`.
          video = {
            width: { ideal: 3840 },
            height: { ideal: 2160 },
            frameRate: { ideal: 60 },
          } // video cam constraints default
        } else {
          // This will make the browser use as ideal hdVideo and 30fps.
          video = {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          } // on default as hdVideo
        }
        break
      case 'qvgaVideo':
        video = {
          width: { exact: 320 },
          height: { exact: 240 },
          frameRate,
        } // video cam constraints low bandwidth
        break
      case 'vgaVideo':
        video = {
          width: { exact: 640 },
          height: { exact: 480 },
          frameRate,
        } // video cam constraints medium bandwidth
        break
      case 'hdVideo':
        video = {
          width: { exact: 1280 },
          height: { exact: 720 },
          frameRate,
        } // video cam constraints high bandwidth
        break
      case 'fhdVideo':
        video = {
          width: { exact: 1920 },
          height: { exact: 1080 },
          frameRate,
        } // video cam constraints very high bandwidth
        break
      case '2kVideo':
        video = {
          width: { exact: 2560 },
          height: { exact: 1440 },
          frameRate,
        } // video cam constraints ultra high bandwidth
        break
      case '4kVideo':
        video = {
          width: { exact: 3840 },
          height: { exact: 2160 },
          frameRate,
        } // video cam constraints ultra high bandwidth
        break
      default:
        break
    }
    if (videoInputDeviceId.value) {
      video.deviceId = { exact: videoInputDeviceId.value }
    }
    console.log('Video constraints', video)
    return video
  }

  async getAudioConstraints(): Promise<MediaTrackConstraints> {
    const { autoGainControl, echoCancellation, noiseSuppression, sampleRate, sampleSize, channelCount, latency, volume } = this
    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-expect-error
    const audio: MediaTrackConstraints = { autoGainControl, echoCancellation, noiseSuppression, sampleRate, sampleSize, channelCount, latency, volume }
    if (audioInputDeviceId.value) {
      audio.deviceId = { exact: audioInputDeviceId.value }
    }
    console.log('Audio constraints', audio)
    return audio
  }

  // 视频开关
  async handleVideo() {
    if (!local.value.useVideo) {
      return
    }

    local.value.videoStatus = !local.value.videoStatus

    if (!local.value.videoStatus) {
      await this.stopVideoTracks(this.localVideoStream)
    } else {
      await this.setupLocalVideo(true)
    }

    this.localVideoStream.getVideoTracks()[0].enabled = local.value.videoStatus

    this.sendLocalVideoStatus(local.value.videoStatus)
  }

  // 音频开关
  async handleAudio() {
    if (!local.value.useAudio) {
      return
    }
    local.value.audioStatus = !local.value.audioStatus
    this.localAudioStream.getAudioTracks()[0].enabled = local.value.audioStatus
    this.sendLocalAudioStatus(local.value.audioStatus)
  }

  // 举手
  switchHandStatus() {
    local.value.handStatus = !local.value.handStatus
    this.emitPeerStatus('hand', local.value.handStatus)
    if (local.value.handStatus) {
      playSound('raiseHand')
    }
  }

  // 屏幕共享
  async switchScreenSharing(init: boolean = false) {
    try {
      local.value.screenStatus = !local.value.screenStatus

      if (!local.value.screenStatus) {
        this.localVideoStatusBefore = local.value.videoStatus
        console.log(`屏幕共享前的视频状态: ${this.localVideoStatusBefore}`)
      } else {
        if (!local.value.useAudio && !local.value.useVideo) {
          return this.handleToggleScreenException('没有音频和视频设备, 不能共享屏幕', init)
        }
      }

      const constraints = await this.getAudioVideoConstraints()

      console.log('%cVideo AND Audio constraints', 'color:red;', constraints)

      // Get screen or webcam media stream based on current state
      const screenMediaPromise = await navigator.mediaDevices.getUserMedia(constraints)
      if (screenMediaPromise) {
        local.value.privacyStatus = false
        this.emitPeerStatus('privacy', local.value.privacyStatus)

        if (local.value.screenStatus) {
          this.setLocalVideoStatusTrue()
          await this.emitPeerAction('screenStart')
        } else {
          await this.emitPeerAction('screenStop')
        }

        await this.emitPeerStatus('screen', local.value.screenStatus)

        await this.stopLocalVideoTrack()
        await this.refreshLocalStream(screenMediaPromise, !local.value.useAudio)
        await this.refreshStreamToPeers(screenMediaPromise, !local.value.useAudio)

        if (init) {
          // Handle init media stream
          if (this.localVideoStream) {
            await this.stopTracks(this.localVideoStream)
          }
          this.localVideoStream = screenMediaPromise
          if (this.hasVideoTrack(this.localVideoStream)) {
            const newInitStream = new MediaStream([this.localVideoStream.getVideoTracks()[0]])
            this.videoElement.srcObject = newInitStream
          }
        }

        // Disable cam video when screen sharing stops
        if (!init && !local.value.screenStatus && !this.localVideoStatusBefore) {
          this.setLocalVideoOff()
        }
        // Enable cam video when screen sharing stops
        if (!init && !local.value.screenStatus && this.localVideoStatusBefore) {
          this.setLocalVideoStatusTrue()
        }

        if (local.value.screenStatus) {
          pinnedId.value = local.value.userId
        }
      }
    } catch (err) {
      if ((err as { name: string }).name === 'NotAllowedError') {
        console.error('Screen sharing permission was denied by the user.')
      } else {
        await this.handleToggleScreenException(`[Warning] Unable to share the screen: ${err}`, init)
      }
    }
  }

  async handleToggleScreenException(reason: string, init: boolean) {
    try {
      console.warn('handleToggleScreenException', reason)

      // Update video privacy status
      local.value.privacyStatus = false
      this.emitPeerStatus('privacy', local.value.privacyStatus)

      // Inform peers about screen sharing stop
      await this.emitPeerAction('screenStop')

      // Turn off your video
      this.setLocalVideoOff()

      // Toggle screen streaming status
      local.value.screenStatus = !local.value.screenStatus

      // Update screen sharing status 更新UI

      // Emit screen status to peers
      this.emitPeerStatus('screen', local.value.screenStatus)

      // Stop the local video track
      await this.stopLocalVideoTrack()

      // Handle video status based on conditions
      if (!init && !local.value.screenStatus && !this.localVideoStatusBefore) {
        this.setLocalVideoOff()
      } else if (!init && !local.value.screenStatus && this.localVideoStatusBefore) {
        this.setLocalVideoStatusTrue()
      }

      // Automatically pin the video if screen sharing or video is pinned
      if (local.value.screenStatus) {
        pinnedId.value = 0
      }
    } catch (error) {
      console.error('[Error] An unexpected error occurred', error)
    }
  }
}

export function useMediaServer() {
  return new MediaServer()
}
