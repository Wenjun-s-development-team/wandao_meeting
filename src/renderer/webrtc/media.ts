import { storeToRefs } from 'pinia'
import type { Client } from './client'
import { Microphone } from './microphone'
import { playSound } from '@/utils'
import { useWebrtcStore } from '@/store'

const webrtcStore = useWebrtcStore()
const {
  useVideo,
  useAudio,
  useScreen,
  videoPrivacy,
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
  microphone: Microphone
  // videoFps = reactive([5, 15, 30, 60]) // 每秒帧数
  declare videoElement: HTMLVideoElement
  declare audioElement: HTMLAudioElement
  declare volumeElement: HTMLDivElement | undefined

  declare localVideoStream: MediaStream
  declare localAudioStream: MediaStream

  declare remoteAvatarImage: HTMLImageElement
  declare remoteVideoElement: HTMLVideoElement
  declare remoteAudioElement: HTMLAudioElement

  declare videoStatus: boolean
  declare audioStatus: boolean
  declare audioVolume: boolean
  declare screenStatus: boolean
  localVideoStatusBefore: boolean = false
  isVideoPinned: boolean = false // 是否固定
  initStream: MediaStream | null = null
  isRulesActive: boolean = false
  isPresenter: boolean = false

  videoQuality: string = 'default'
  videoMaxFrameRate: number = 30
  screenFpsSelect: number = 30
  forceCamMaxResolutionAndFps: boolean = false

  autoGainControl: boolean = true // 自动增益
  echoCancellation: boolean = true // 消除回声
  noiseSuppression: boolean = true // 噪声抑制
  sampleRate: number = 48000 // 采样率 48000 | 44100
  sampleSize: number = 32 // 采样大小 16 ｜ 32
  channelCount: number = 2 // 通道数 1(mono = 单声道) ｜ 2(stereo = 立体声)
  latency: number = 50 // 延迟ms min="10" max="1000" value="50" step="10"
  volume: number = 100 / 100 // 音量 min="0" max="100" value="100" step="10"

  constructor(client?: Client) {
    this.client = client
    this.microphone = new Microphone(this.client)
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
      ? constraints || await this.getVideoConstraints('default')
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

    const audioConstraints = toValue(useAudio) ? constraints || await this.getAudioConstraints() : false

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
      webrtcStore.setRemoteVideo({ userId, stream, room, kind })
    } else if (kind === 'audio') {
      console.log('🔈 SETUP REMOTE AUDIO STREAM', stream.id)
      webrtcStore.setRemoteAudio({ userId, stream, room, kind })
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

  async toggleScreenSharing(init: boolean = false) {
    try {
      const constraints = {
        audio: !useAudio.value,
        video: { frameRate: this.screenFpsSelect },
      }

      if (useScreen.value && !useVideo.value && !useAudio.value) {
        return this.handleToggleScreenException('音频和视频被禁用, 不能共享屏幕', init)
      } else {
        console.log('Video AND Audio constraints', constraints)
      }

      // Get screen or webcam media stream based on current state
      const screenMediaPromise = useScreen.value
        ? await navigator.mediaDevices.getUserMedia(await this.getAudioVideoConstraints())
        : await navigator.mediaDevices.getUserMedia(constraints)

      if (screenMediaPromise) {
        videoPrivacy.value = false
        this.emitPeerStatus('privacy', videoPrivacy.value)

        this.screenStatus = useScreen.value

        if (useScreen.value) {
          this.setLocalVideoStatusTrue()
          this.emitPeerAction('screenStart')
        } else {
          this.emitPeerAction('screenStop')
        }

        await this.emitPeerStatus('screen', this.screenStatus)

        await this.stopLocalVideoTrack()
        await this.refreshLocalStream(screenMediaPromise, !useAudio.value)
        await this.refreshStreamToPeers(screenMediaPromise, !useAudio.value)

        if (init) {
          // Handle init media stream
          if (this.initStream) {
            await this.stopTracks(this.initStream)
          }
          this.initStream = screenMediaPromise
          if (this.hasVideoTrack(this.initStream)) {
            const newInitStream = new MediaStream([this.initStream.getVideoTracks()[0]])
            this.videoElement.srcObject = newInitStream
          }
        }

        // Disable cam video when screen sharing stops
        if (!init && !useScreen.value && !this.localVideoStatusBefore) {
          this.setLocalVideoOff()
        }
        // Enable cam video when screen sharing stops
        if (!init && !useScreen.value && this.localVideoStatusBefore) {
          this.setLocalVideoStatusTrue()
        }

        if (useScreen.value || this.isVideoPinned) {
          // myVideoPinBtn.click()
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
      videoPrivacy.value = false
      this.emitPeerStatus('privacy', videoPrivacy.value)

      // Inform peers about screen sharing stop
      this.emitPeerAction('screenStop')

      // Turn off your video
      this.setLocalVideoOff()

      // Toggle screen streaming status
      useScreen.value = !useScreen.value
      this.screenStatus = useScreen.value

      // Update screen sharing status 更新UI

      // Emit screen status to peers
      this.emitPeerStatus('screen', this.screenStatus)

      // Stop the local video track
      await this.stopLocalVideoTrack()

      // Handle video status based on conditions
      if (!init && !useScreen.value && !this.localVideoStatusBefore) {
        this.setLocalVideoOff()
      } else if (!init && !useScreen.value && this.localVideoStatusBefore) {
        this.setLocalVideoStatusTrue()
      }

      // Automatically pin the video if screen sharing or video is pinned
      if (useScreen.value || this.isVideoPinned) {
        // myVideoPinBtn.click()
      }
    } catch (error) {
      console.error('[Error] An unexpected error occurred', error)
    }
  }

  async emitPeerStatus(action: string, status: boolean) {
    this.client?.sendToServer('peerStatus', {
      action,
      status,
      userId: this.client.userId,
      roomId: this.client.roomId,
    })
  }

  emitPeerAction(action: string) {
    if (!this.client?.peerCount) {
      return
    }

    this.client?.sendToServer('peerAction', {
      action,
      roomId: this.client.roomId,
      userId: this.client.userId,
      peerVideo: useVideo.value,
      sendToAll: true,
    })
  }

  setLocalVideoOff() {
    if (!useVideo.value) {
      return
    }
    // if (this.videoStatus === false || !useVideo) return;
    this.videoStatus = false
    this.localVideoStream.getVideoTracks()[0].enabled = this.videoStatus

    this.setLocalVideoStatus(this.videoStatus)
    playSound('off')
  }

  setLocalVideoStatus(status: boolean) {
    console.log('local video status', status)
    // send my video status to all peers in the room
    this.emitPeerStatus('video', status)
    playSound(status ? 'on' : 'off')
  }

  setPeerVideoStatus(userId: number, status: boolean) {
    console.log('更新UI', userId)
    if (status) {
      if (this.videoStatus) {
        playSound('on')
      }
    } else {
      if (this.videoStatus) {
        playSound('off')
      }
    }
  }

  setPeerAudioStatus(userId: number, status: boolean) {
    console.log('更新UI', userId)
    if (this.audioStatus) {
      status ? playSound('on') : playSound('off')
    }
    if (this.audioVolume) {
      // audioVolume
    }
  }

  setPeerHandStatus(userId: number, status: boolean) {
    console.log('更新UI', userId)
    if (status) {
      playSound('raiseHand')
    } else {
      // elemDisplay(peerHandStatus, false);
    }
  }

  setVideoPrivacyStatus(status: boolean, userId?: number) {
    console.log(userId)
    // const peer = remoteVideo.value.find(v => v.userId === userId)
    if (status) {
      this.videoElement.style.objectFit = 'cover'
    } else {
      this.videoElement.style.objectFit = 'cover'
    }
  }

  async setLocalVideoStatusTrue() {
    if (this.videoStatus || !useVideo.value) {
      return
    }
    // Put video status already ON
    this.videoStatus = true
    this.localVideoStream.getVideoTracks()[0].enabled = this.videoStatus

    this.emitPeerStatus('video', this.videoStatus)
  }

  async stopLocalVideoTrack() {
    if (useVideo.value || !useScreen.value) {
      const localVideoTrack = this.localVideoStream.getVideoTracks()[0]
      if (localVideoTrack) {
        console.log('stopLocalVideoTrack', localVideoTrack)
        localVideoTrack.stop()
      }
    }
  }

  async refreshLocalStream(stream: MediaStream, localAudioTrackChange = false) {
    let { videoElement, audioElement, localVideoStream, localAudioStream } = this
    // enable video
    if (useVideo.value || useScreen.value) {
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
    if (useVideo.value || useScreen.value) {
      console.log('刷新本地媒体流视频-音频:', useScreen.value)
      if (videoTrack) {
        tracksToInclude.push(videoTrack)
        localVideoStream = new MediaStream([videoTrack])
        this.attachMediaStream(videoElement, localVideoStream)
        this.logStreamInfo('refreshMyLocalStream-localVideoMediaStream', localVideoStream)
      }
      if (audioTrack) {
        tracksToInclude.push(audioTrack)
        localAudioStream = new MediaStream([audioTrack])
        this.attachMediaStream(audioElement, localAudioStream)
        // this.microphone.getMicrophoneVolumeIndicator(localAudioStream)
        this.logStreamInfo('refreshMyLocalStream-localAudioMediaStream', localAudioStream)
      }
    } else {
      console.log('Refresh my local media stream AUDIO')
      if (useAudio.value && audioTrack) {
        tracksToInclude.push(audioTrack)
        localAudioStream = new MediaStream([audioTrack])
        // this.microphone.getMicrophoneVolumeIndicator(localAudioStream)
        this.logStreamInfo('refreshMyLocalStream-localAudioMediaStream', localAudioStream)
      }
    }

    if (useScreen.value) {
      // refresh video privacy mode on screen sharing
      videoPrivacy.value = false
      this.setVideoPrivacyStatus(videoPrivacy.value)

      // on toggleScreenSharing video stop from popup bar
      stream.getVideoTracks()[0].onended = () => {
        this.toggleScreenSharing()
      }
    }

    // adapt video object fit on screen streaming
    videoElement.style.objectFit = useScreen.value ? 'contain' : 'cover'
  }

  async refreshStreamToPeers(stream: MediaStream, localAudioTrackChange = false) {
    if (!this.client?.peerCount) {
      return
    }

    const { localVideoStream, localAudioStream } = this

    if (useAudio.value && localAudioTrackChange) {
      localAudioStream.getAudioTracks()[0].enabled = this.audioStatus
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
        = streamHasAudioTrack && (localAudioTrackChange || useScreen.value)
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

        if (useVideo.value && videoSender) {
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

  async getAudioVideoConstraints(): Promise<MediaStreamConstraints> {
    // videoQualitySelect
    const audioSource = audioInputDeviceId.value
    const videoSource = videoInputDeviceId.value
    let videoConstraints: MediaTrackConstraints = {}
    if (useScreen.value && screenId.value) {
      videoConstraints = {
        // eslint-disable-next-line ts/ban-ts-comment
        // @ts-expect-error
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: screenId.value,
        },
      }
    } else if (useVideo.value) {
      videoConstraints = await this.getVideoConstraints(this.videoQuality || 'default')
      videoConstraints.deviceId = videoSource ? { exact: videoSource } : undefined
    }
    let audioConstraints: MediaTrackConstraints = {}
    if (useAudio.value) {
      audioConstraints = await this.getAudioConstraints()
      audioConstraints.deviceId = audioSource ? { exact: audioSource } : undefined
    }
    return {
      audio: useScreen.value ? false : audioConstraints,
      video: videoConstraints,
    }
  }

  async getVideoConstraints(videoQuality: string = 'default'): Promise<MediaTrackConstraints> {
    const frameRate = this.videoMaxFrameRate
    let video: MediaTrackConstraints = {}

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
    console.log('Video constraints', video)
    return video
  }

  async getAudioConstraints(): Promise<MediaTrackConstraints> {
    let audio: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
    }
    if (this.isRulesActive && this.isPresenter) {
      const { autoGainControl, echoCancellation, noiseSuppression, sampleRate, sampleSize, channelCount, latency, volume } = this
      // eslint-disable-next-line ts/ban-ts-comment
      // @ts-expect-error
      audio = { autoGainControl, echoCancellation, noiseSuppression, sampleRate, sampleSize, channelCount, latency, volume }
    }
    console.log('Audio constraints', audio)
    return audio
  }
}

export function useMediaServer() {
  return new MediaServer()
}
