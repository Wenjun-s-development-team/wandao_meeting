import { storeToRefs } from 'pinia'
import type { Client } from './client'
import { Microphone } from './microphone'
import { playSound } from '@/utils'
import { useWebrtcStore } from '@/store'

const webrtcStore = useWebrtcStore()
const {
  local,
  screenId,
  remoteVideo,
  remoteAudio,
  videoInputDeviceId,
  audioInputDeviceId,
  audioOutputDeviceId,
  videoInputDevices,
  audioInputDevices,
  audioOutputDevices,
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

  declare audioVolume: boolean

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
      if (!local.value.useVideo || (!local.value.useVideo && !local.value.useAudio)) {
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

    local.value.useVideo = videoInputDevices.value.length > 0
    local.value.useAudio = audioInputDevices.value.length > 0
  }

  async setupLocalVideo(constraints?: KeyValue) {
    if (!local.value.useVideo || this.localVideoStream) {
      return
    }

    console.log('📹 请求访问视频输入设备')

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

    const videoConstraints = local.value.useVideo || local.value.screenStatus
      ? constraints || await this.getVideoConstraints('default')
      : false

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
    if (!local.value.useAudio || this.localAudioStream) {
      return
    }

    console.log('🎤 请求访问音频输入设备')

    const audioConstraints = local.value.useAudio ? constraints || await this.getAudioConstraints() : false

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
      if (stream) {
        await this.loadLocalMedia(stream, 'audio')
        if (local.value.useAudio) {
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

    if (kind === 'video') {
      console.log('📹 SETUP REMOTE VIDEO STREAM', stream.id)
      webrtcStore.setRemoteVideo({ userId, stream, kind, ...peer })
    } else if (kind === 'audio') {
      console.log('🔈 SETUP REMOTE AUDIO STREAM', stream.id)
      webrtcStore.setRemoteAudio({ userId, stream, kind, ...peer })
    }
  }

  cleanRemoteMedia() {
    remoteVideo.value = []
    remoteAudio.value = []
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
        audio: !local.value.audioStatus,
        video: { frameRate: this.screenFpsSelect },
      }

      local.value.screenStatus = !local.value.screenStatus

      if (!local.value.screenStatus) {
        this.localVideoStatusBefore = local.value.videoStatus
        console.log(`屏幕共享前的视频状态: ${this.localVideoStatusBefore}`)
      } else {
        if (!local.value.useAudio && !local.value.useVideo) {
          return this.handleToggleScreenException('没有音频和视频设备, 不能共享屏幕', init)
        } else {
          console.log('Video AND Audio constraints', constraints)
        }
      }

      // Get screen or webcam media stream based on current state
      const screenMediaPromise = await navigator.mediaDevices.getUserMedia(await this.getAudioVideoConstraints())
      if (screenMediaPromise) {
        local.value.privacyStatus = false
        this.emitPeerStatus('privacy', local.value.privacyStatus)

        if (local.value.screenStatus) {
          this.setLocalVideoStatusTrue()
          this.emitPeerAction('screenStart')
        } else {
          this.emitPeerAction('screenStop')
        }

        await this.emitPeerStatus('screen', local.value.screenStatus)

        await this.stopLocalVideoTrack()
        await this.refreshLocalStream(screenMediaPromise, !local.value.useAudio)
        await this.refreshStreamToPeers(screenMediaPromise, !local.value.useAudio)

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
        if (!init && !local.value.screenStatus && !this.localVideoStatusBefore) {
          this.setLocalVideoOff()
        }
        // Enable cam video when screen sharing stops
        if (!init && !local.value.screenStatus && this.localVideoStatusBefore) {
          this.setLocalVideoStatusTrue()
        }

        if (local.value.screenStatus || this.isVideoPinned) {
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
      local.value.privacyStatus = false
      this.emitPeerStatus('privacy', local.value.privacyStatus)

      // Inform peers about screen sharing stop
      this.emitPeerAction('screenStop')

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
      if (local.value.screenStatus || this.isVideoPinned) {
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
      roomId: local.value.roomId,
      userId: local.value.userId,
    })
  }

  emitPeerAction(action: string) {
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

  setLocalVideoOff() {
    if (!local.value.useVideo) {
      return
    }
    // if (this.videoStatus === false || !useVideo) return;
    local.value.videoStatus = false
    this.localVideoStream.getVideoTracks()[0].enabled = local.value.videoStatus

    this.setLocalVideoStatus(local.value.videoStatus)
    playSound('off')
  }

  setLocalVideoStatus(status: boolean) {
    console.log('local video status', status)
    this.emitPeerStatus('video', status)
    playSound(status ? 'on' : 'off')
  }

  setPeerStatus(type: string, userId: number, status: boolean) {
    if (!['videoStatus', 'audioStatus', 'handStatus', 'recordStatus', 'privacyStatus'].includes(type)) {
      return
    }

    console.log('setStatus:', { type, userId, status })

    if (type === 'videoStatus') {
      if (local.value.userId === userId) {
        local.value.videoStatus = status
      } else {
        remoteVideo.value.find((peer) => {
          if (peer.userId === userId) {
            peer.videoStatus = status
            return true
          }
          return false
        })
      }
      status ? playSound('on') : playSound('off')
    } else if (type === 'audioStatus') {
      if (local.value.userId === userId) {
        local.value.audioStatus = status
      } else {
        remoteAudio.value.find((peer) => {
          if (peer.userId === userId) {
            peer.audioStatus = status
            return true
          }
          return false
        })
      }
      status ? playSound('on') : playSound('off')
    } else if (type === 'handStatus') {
      local.value.handStatus = status
      if (status) {
        playSound('raiseHand')
      }
    } else {
      local.value[type] = status
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
        // this.microphone.getMicrophoneVolumeIndicator(localAudioStream)
        this.logStreamInfo('refreshLocalStream-localAudioMediaStream', localAudioStream)
      }
    } else {
      console.log('Refresh my local media stream AUDIO')
      if (local.value.useAudio && audioTrack) {
        tracksToInclude.push(audioTrack)
        localAudioStream = new MediaStream([audioTrack])
        // this.microphone.getMicrophoneVolumeIndicator(localAudioStream)
        this.logStreamInfo('refreshLocalStream-localAudioMediaStream', localAudioStream)
      }
    }

    if (local.value.screenStatus) {
      // refresh video privacy mode on screen sharing
      local.value.privacyStatus = false
      this.setPeerStatus('privacyStatus', local.value.userId, local.value.privacyStatus)

      // on toggleScreenSharing video stop from popup bar
      stream.getVideoTracks()[0].onended = () => {
        this.toggleScreenSharing()
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

  async handleVideo() {
    if (!local.value.useVideo) {
      return
    }

    local.value.videoStatus = !local.value.videoStatus
    this.localVideoStream.getVideoTracks()[0].enabled = local.value.videoStatus

    if (!local.value.videoStatus) {
      if (!local.value.screenStatus) {
        await this.stopVideoTracks(this.localVideoStream)
      }
    } else {
      await this.changeInitCamera(videoInputDeviceId.value)
    }

    this.setLocalVideoStatus(local.value.videoStatus)
  }

  async changeInitCamera(deviceId) {
    if (this.localVideoStream) {
      await this.stopVideoTracks(this.localVideoStream)
    }

    // Get video constraints
    const videoConstraints = await this.getVideoConstraints('default')
    videoConstraints.deviceId = { exact: deviceId }

    /**
     * Update Init/Local Video Stream
     * @param {MediaStream} camStream
     */
    const updateInitLocalVideoMediaStream = (camStream) => {
      if (camStream) {
        // We going to update init video stream
        this.videoElement.srcObject = camStream
        this.localVideoStream = camStream
        console.log('Success attached init video stream', this.localVideoStream.getVideoTracks()[0].getSettings())
      }
    }

    /**
     * Something going wrong
     * @param {object} err
     */
    const reloadBrowser = (err) => {
      console.error('[Error] changeInitCamera', err)

      setTimeout(() => {
        location.reload()
      }, 3000)
    }

    await navigator.mediaDevices.getUserMedia({ video: videoConstraints }).then((camStream) => {
      updateInitLocalVideoMediaStream(camStream)
    }).catch(async (err) => {
      console.error('Error accessing init video device', err)
      console.warn('Fallback to default constraints')
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: {
              exact: deviceId, // Specify the exact device ID you want to access
            },
          },
        }) // Fallback to default constraints
        updateInitLocalVideoMediaStream(camStream)
      } catch (fallbackErr) {
        console.error('Error accessing init video device with default constraints', fallbackErr)
        reloadBrowser(err)
      }
    })
  }

  async getAudioVideoConstraints(): Promise<MediaStreamConstraints> {
    // videoQualitySelect
    const audioSource = audioInputDeviceId.value
    const videoSource = videoInputDeviceId.value
    let videoConstraints: MediaTrackConstraints = {}

    if (local.value.screenStatus && screenId.value) {
      videoConstraints = {
        // eslint-disable-next-line ts/ban-ts-comment
        // @ts-expect-error
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: screenId.value,
        },
      }
    } else if (local.value.videoStatus) {
      videoConstraints = await this.getVideoConstraints(this.videoQuality || 'default')
      videoConstraints.deviceId = videoSource ? { exact: videoSource } : undefined
    }
    let audioConstraints: MediaTrackConstraints = {}
    if (local.value.audioStatus) {
      audioConstraints = await this.getAudioConstraints()
      audioConstraints.deviceId = audioSource ? { exact: audioSource } : undefined
    }
    return {
      audio: local.value.audioStatus ? false : audioConstraints,
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

  async onScreenSharing() {
    if (local.value.screenStatus && screenId.value) {
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
  }

  onHandStatus() {
    local.value.handStatus = !local.value.handStatus
    this.emitPeerStatus('hand', local.value.handStatus)
    if (local.value.handStatus) {
      playSound('raiseHand')
    }
  }

  // 监听
  listen_back() {
    // 屏幕共享、设备切换 - 需重新创建 stream
    watch([local.value.screenStatus, videoInputDeviceId, audioInputDeviceId], async () => {
      if (local.value.screenStatus && screenId.value) {
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
    })

    // 监听 音频视频 启用/禁用 - 不需重新创建 stream
    watch([local.value.useVideo, local.value.useAudio], () => {
      this.setVideoTracks(local.value.useVideo)
      this.setAudioTracks(local.value.useAudio)
    })
  }
}

export function useMediaServer() {
  return new MediaServer()
}
