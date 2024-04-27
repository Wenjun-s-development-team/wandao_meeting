import { storeToRefs } from 'pinia'
import { Client, GetMicrophoneVolumeIndicator } from '.'
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
  static videoElement: HTMLVideoElement
  static audioElement: HTMLAudioElement
  static volumeElement: HTMLDivElement | undefined

  static localVideoStream: MediaStream
  static localAudioStream: MediaStream

  static remoteVideoElement: HTMLVideoElement

  static localVideoStatusBefore: boolean = false

  // 视频设置
  static videoMaxFrameRate: number = 60 // 每秒帧数 5, 15, 30, 60
  static forceCamMaxResolutionAndFps: boolean = false

  // 音频设置
  static sinkId = 'sinkId' in HTMLMediaElement.prototype
  static autoGainControl: boolean = true // 自动增益
  static echoCancellation: boolean = true // 消除回声
  static noiseSuppression: boolean = true // 噪声抑制
  static sampleRate: number = 48000 // 采样率 48000 | 44100
  static sampleSize: number = 32 // 采样大小 16 ｜ 32
  static channelCount: number = 2 // 通道数 1(mono = 单声道) ｜ 2(stereo = 立体声)
  static latency: number = 50 // 延迟ms min="10" max="1000" value="50" step="10"
  static volume: number = 1 // 音量 min="0" max="100" value="100" step="10"

  static async start(videoElement: HTMLVideoElement, audioElement: HTMLAudioElement, volumeElement?: HTMLDivElement) {
    remotePeers.value = {}
    MediaServer.videoElement = videoElement
    MediaServer.audioElement = audioElement
    MediaServer.volumeElement = volumeElement

    await MediaServer.initEnumerateDevices()
    await MediaServer.setupLocalVideo()
    await MediaServer.setupLocalAudio()
    if (!local.value.useVideo || (!local.value.useVideo && !local.value.useAudio)) {
      await MediaServer.loadLocalMedia(new MediaStream(), 'video')
    }
  }

  static async initEnumerateDevices() {
    console.log('05. 获取视频和音频设备', isEnumerateDevices.value)
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

  static async setupLocalVideo(toPeers?: boolean) {
    if (MediaServer.localVideoStream) {
      // await MediaServer.stopTracks(MediaServer.localVideoStream, 'video')
    }

    console.log('📹 请求访问视频输入设备')

    const videoConstraints = local.value.videoStatus || local.value.screenStatus
      ? await MediaServer.getVideoConstraints('default')
      : false

    try {
      MediaServer.localVideoStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints })
      await MediaServer.loadLocalMedia(MediaServer.localVideoStream, 'video')
      if (toPeers) {
        MediaServer.refreshStreamToPeers(MediaServer.localVideoStream)
      }
    } catch (err) {
      console.error('访问视频设备时出错, 加载默认媒体流', err)
      try {
        MediaServer.localVideoStream = await navigator.mediaDevices.getUserMedia({ video: true })
        await MediaServer.loadLocalMedia(MediaServer.localVideoStream, 'video')
        if (toPeers) {
          MediaServer.refreshStreamToPeers(MediaServer.localVideoStream)
        }
      } catch (fallbackErr) {
        console.error('访问默认约束的视频设备时出错', fallbackErr)
        playSound('alert')
      }
    }
  }

  static async setupLocalAudio() {
    if (!local.value.useAudio || MediaServer.localAudioStream) {
      return
    }
    console.log('🎤 请求访问音频输入设备')
    const audioConstraints = await MediaServer.getAudioConstraints()
    try {
      MediaServer.localAudioStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
      await MediaServer.loadLocalMedia(MediaServer.localAudioStream, 'audio')
      await GetMicrophoneVolumeIndicator.start(MediaServer.localAudioStream)
      console.log('10. 🎤 授予对音频设备的访问权限')
    } catch (err) {
      console.log('audio', err)
      playSound('alert')
    }
  }

  static async loadLocalMedia(stream: MediaStream, kind: string) {
    if (stream) {
      console.log('加载本地媒体流轨道', stream.getTracks())
    }

    if (kind === 'video') {
      console.log('设置本地视频流')
      MediaServer.logStreamInfo('localVideoMediaStream', stream)
      MediaServer.attachMediaStream(MediaServer.videoElement, stream)
    } else if (kind === 'audio') {
      console.log('设置本地音频流')
      MediaServer.logStreamInfo('localAudioMediaStream', stream)
      MediaServer.attachMediaStream(MediaServer.audioElement, stream)
    }
  }

  static logStreamInfo(name: string, stream: MediaStream) {
    if ((local.value.useVideo || local.value.screenStatus) && MediaServer.hasVideoTrack(stream)) {
      console.log(name, {
        video: {
          label: stream.getVideoTracks()[0].label,
          settings: stream.getVideoTracks()[0].getSettings(),
        },
      })
    }
    if (local.value.useAudio && MediaServer.hasAudioTrack(stream)) {
      console.log(name, {
        audio: {
          label: stream.getAudioTracks()[0].label,
          settings: stream.getAudioTracks()[0].getSettings(),
        },
      })
    }
  }

  static attachMediaStream(element: HTMLVideoElement | HTMLAudioElement, stream: MediaStream) {
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
  static async loadRemoteMediaStream(stream: MediaStream, peers: KeyValue, userId: string, kind: string) {
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
  static async handleOnTrack(userId: string, peers: KeyValue) {
    console.log('[ON TRACK] - userId', { userId })

    Client.peerConnections[userId].ontrack = (event) => {
      const peer = peers[userId]
      const { roomName } = peer
      const { kind } = event.track

      console.log('[ON TRACK] - info', { userId, roomName, kind })

      if (event.streams && event.streams[0]) {
        console.log('[ON TRACK] - peers', peers)

        switch (kind) {
          case 'video':
            remotePeers.value[userId]
              ? remotePeers.value[userId].videoStream = event.streams[0]
              : MediaServer.loadRemoteMediaStream(event.streams[0], peers, userId, kind)
            break
          case 'audio':
            remotePeers.value[userId]
              ? remotePeers.value[userId].audioStream = event.streams[0]
              : MediaServer.loadRemoteMediaStream(event.streams[0], peers, userId, kind)
            break
          default:
            break
        }
      } else {
        console.log('[ON TRACK] - SCREEN SHARING', { userId, roomName, kind })
        const inboundStream = new MediaStream([event.track])
        remotePeers[userId].videoStream = inboundStream
      }
    }
  }

  /**
   * 将本地音视频流添加到P2P连接中
   * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addTrack
   * @param {string} userId socket.id
   */
  static async handleAddTracks(userId: string) {
    if (Client) {
      const roomName = Client.allPeers[userId].roomName
      const { localVideoStream, localAudioStream } = MediaServer
      const videoTrack = localVideoStream && localVideoStream.getVideoTracks()[0]
      const audioTrack = localAudioStream && localAudioStream.getAudioTracks()[0]

      console.log('handleAddTracks', { videoTrack, audioTrack })

      if (videoTrack) {
        console.log(`[ADD VIDEO TRACK] to Peer Name [${roomName}]`)
        Client.peerConnections[userId].addTrack(videoTrack, localVideoStream)
      }

      if (audioTrack) {
        console.log(`[ADD AUDIO TRACK] to Peer Name [${roomName}]`)
        Client.peerConnections[userId].addTrack(audioTrack, localAudioStream)
      }
    }
  }

  static hasAudioTrack(stream: MediaStream) {
    if (!stream) {
      return false
    }
    const audioTracks = stream.getAudioTracks()
    return audioTracks.length > 0
  }

  static hasVideoTrack(stream: MediaStream) {
    if (!stream) {
      return false
    }
    const videoTracks = stream.getVideoTracks()
    return videoTracks.length > 0
  }

  static async stopTracks(stream: MediaStream, type?: string) {
    if (!stream) {
      return
    }

    stream.getTracks().forEach((track) => {
      if (track.kind === type) {
        track.stop()
      } else if (!type) {
        track.stop()
      }
    })
  }

  static setLocalVideoOff() {
    if (!local.value.useVideo) {
      return
    }

    local.value.videoStatus = false
    MediaServer.localVideoStream.getVideoTracks()[0].enabled = local.value.videoStatus

    MediaServer.sendLocalVideoStatus(local.value.videoStatus)
    playSound('off')
  }

  static setLocalAudioOff() {
    if (!local.value.audioStatus || !local.value.useAudio) {
      return
    }
    MediaServer.localAudioStream.getAudioTracks()[0].enabled = false
    MediaServer.sendLocalAudioStatus(local.value.audioStatus)
    playSound('off')
  }

  static async setLocalVideoStatusTrue() {
    if (local.value.videoStatus || !local.value.useVideo) {
      return
    }
    // Put video status already ON
    local.value.videoStatus = true
    MediaServer.localVideoStream.getVideoTracks()[0].enabled = local.value.videoStatus

    MediaServer.emitPeerStatus('video', local.value.videoStatus)
  }

  static async stopLocalVideoTrack() {
    if (local.value.useVideo || !local.value.screenStatus) {
      const localVideoTrack = MediaServer.localVideoStream.getVideoTracks()[0]
      if (localVideoTrack) {
        console.log('stopLocalVideoTrack', localVideoTrack)
        localVideoTrack.stop()
      }
    }
  }

  static setPeerStatus(type: string, userId: number, status: boolean) {
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

  static async refreshLocalStream(stream: MediaStream, localAudioTrackChange = false) {
    let { videoElement, audioElement, localVideoStream, localAudioStream } = MediaServer
    // enable video
    if (local.value.useVideo || local.value.screenStatus) {
      stream.getVideoTracks()[0].enabled = true
    }

    const tracksToInclude: MediaStreamTrack[] = []

    const videoTrack = MediaServer.hasVideoTrack(stream)
      ? stream.getVideoTracks()[0]
      : MediaServer.hasVideoTrack(localVideoStream) && localVideoStream.getVideoTracks()[0]

    const audioTrack
        = MediaServer.hasAudioTrack(stream) && localAudioTrackChange
          ? stream.getAudioTracks()[0]
          : MediaServer.hasAudioTrack(localAudioStream) && localAudioStream.getAudioTracks()[0]

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaStream
    if (local.value.useVideo || local.value.screenStatus) {
      console.log('刷新本地媒体流 VIDEO - AUDIO:', local.value.screenStatus)
      if (videoTrack) {
        tracksToInclude.push(videoTrack)
        localVideoStream = new MediaStream([videoTrack])
        MediaServer.attachMediaStream(videoElement, localVideoStream)
        MediaServer.logStreamInfo('refreshLocalStream-localVideoMediaStream', localVideoStream)
      }
      if (audioTrack) {
        tracksToInclude.push(audioTrack)
        localAudioStream = new MediaStream([audioTrack])
        MediaServer.attachMediaStream(audioElement, localAudioStream)
        await GetMicrophoneVolumeIndicator.start(localAudioStream)
        MediaServer.logStreamInfo('refreshLocalStream-localAudioMediaStream', localAudioStream)
      }
    } else {
      console.log('Refresh my local media stream AUDIO')
      if (local.value.useAudio && audioTrack) {
        tracksToInclude.push(audioTrack)
        localAudioStream = new MediaStream([audioTrack])
        await GetMicrophoneVolumeIndicator.start(localAudioStream)
        MediaServer.logStreamInfo('refreshLocalStream-localAudioMediaStream', localAudioStream)
      }
    }

    if (local.value.screenStatus) {
      // refresh video privacy mode on screen sharing
      local.value.privacyStatus = false
      MediaServer.setPeerStatus('privacyStatus', local.value.userId, local.value.privacyStatus)

      // on switchScreenSharing video stop from popup bar
      stream.getVideoTracks()[0].onended = () => {
        MediaServer.switchScreenSharing()
      }
    }

    // adapt video object fit on screen streaming
    videoElement.style.objectFit = local.value.screenStatus ? 'contain' : 'cover'
  }

  static async refreshStreamToPeers(stream: MediaStream, localAudioTrackChange = false) {
    if (!Client?.peerCount()) {
      return
    }

    const { localVideoStream, localAudioStream } = MediaServer

    if (local.value.useAudio && localAudioTrackChange) {
      localAudioStream.getAudioTracks()[0].enabled = local.value.audioStatus
    }

    // Log peer connections and all peers
    console.log('PEER-CONNECTIONS', Client.peerConnections)
    console.log('ALL-PEERS', Client.allPeers)

    // Check if the passed stream has an audio track
    const streamHasAudioTrack = MediaServer.hasAudioTrack(stream)

    // Check if the passed stream has an video track
    const streamHasVideoTrack = MediaServer.hasVideoTrack(stream)

    // Check if the local stream has an audio track
    const localStreamHasAudioTrack = MediaServer.hasAudioTrack(localAudioStream)

    // Check if the local stream has an video track
    const localStreamHasVideoTrack = MediaServer.hasVideoTrack(localVideoStream)

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
      for (const userId in Client.peerConnections) {
        const roomName = Client.allPeers[userId].roomName

        // Replace video track
        const videoSender = Client.peerConnections[userId].getSenders().find(s => s.track && s.track.kind === 'video')

        if (local.value.useVideo && videoSender) {
          videoSender.replaceTrack(videoTracks)
          console.log('REPLACE VIDEO TRACK TO', { userId, roomName, video: videoTracks })
        } else {
          if (videoStream) {
            // Add video track if sender does not exist
            videoStream.getTracks().forEach(async (track) => {
              if (track.kind === 'video') {
                Client?.peerConnections[userId].addTrack(track)
                await Client?.handleCreateRTCOffer(Number(userId)) // https://groups.google.com/g/discuss-webrtc/c/Ky3wf_hg1l8?pli=1
                console.log('ADD VIDEO TRACK TO', { userId, roomName, video: track })
              }
            })
          }
        }

        // Replace audio track
        const audioSender = Client.peerConnections[userId].getSenders().find(s => s.track && s.track.kind === 'audio')

        if (audioSender && audioTrack) {
          audioSender.replaceTrack(audioTrack)
          console.log('REPLACE AUDIO TRACK TO', { userId, roomName, audio: audioTrack })
        } else {
          if (audioStream) {
            // Add audio track if sender does not exist
            audioStream.getTracks().forEach(async (track) => {
              if (track.kind === 'audio') {
                Client?.peerConnections[userId].addTrack(track)
                await Client?.handleCreateRTCOffer(Number(userId))
                console.log('ADD AUDIO TRACK TO', { userId, roomName, audio: track })
              }
            })
          }
        }
      }
    }
  }

  static sendLocalVideoStatus(status: boolean) {
    console.log('send local video status', status)
    MediaServer.emitPeerStatus('video', status)
    playSound(status ? 'on' : 'off')
  }

  static sendLocalAudioStatus(status: boolean) {
    console.log('send local audio status', status)
    MediaServer.emitPeerStatus('audio', status)
    playSound(status ? 'on' : 'off')
  }

  static async emitPeerStatus(action: string, status: boolean) {
    Client?.sendToServer('peerStatus', {
      action,
      status,
      roomId: local.value.roomId,
      userId: local.value.userId,
    })
  }

  static async emitPeerAction(action: string) {
    if (!Client?.peerCount) {
      return
    }

    Client?.sendToServer('peerAction', {
      action,
      roomId: local.value.roomId,
      userId: local.value.userId,
      peerVideo: local.value.useVideo,
      sendToAll: true,
    })
  }

  static async getAudioVideoConstraints(): Promise<MediaStreamConstraints> {
    let videoConstraints: MediaTrackConstraints = {}
    let audioConstraints: MediaTrackConstraints = {}

    if (local.value.videoStatus) {
      videoConstraints = await MediaServer.getVideoConstraints('default')
    }
    if (local.value.audioStatus) {
      audioConstraints = await MediaServer.getAudioConstraints()
    }
    return {
      audio: local.value.screenStatus ? false : audioConstraints,
      video: videoConstraints,
    }
  }

  static async getVideoConstraints(videoQuality: string = 'default'): Promise<MediaTrackConstraints> {
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
    const frameRate = MediaServer.videoMaxFrameRate
    switch (videoQuality) {
      case 'default':
        if (MediaServer.forceCamMaxResolutionAndFps) {
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

  static async getAudioConstraints(): Promise<MediaTrackConstraints> {
    const { autoGainControl, echoCancellation, noiseSuppression, sampleRate, sampleSize, channelCount, latency, volume } = MediaServer

    const audio: MediaTrackConstraints = {
      autoGainControl,
      echoCancellation,
      noiseSuppression,
      sampleRate,
      sampleSize,
      channelCount,
      // eslint-disable-next-line ts/ban-ts-comment
      // @ts-expect-error
      latency,
      volume,
    }
    if (audioInputDeviceId.value) {
      audio.deviceId = { exact: audioInputDeviceId.value }
    }
    console.log('Audio constraints', audio)
    return audio
  }

  // 视频开关
  static async handleVideo() {
    if (!local.value.useVideo) {
      return
    }

    local.value.videoStatus = !local.value.videoStatus

    if (!local.value.videoStatus) {
      await MediaServer.stopTracks(MediaServer.localVideoStream, 'video')
    } else {
      await MediaServer.setupLocalVideo(true)
    }

    MediaServer.localVideoStream.getVideoTracks()[0].enabled = local.value.videoStatus

    MediaServer.sendLocalVideoStatus(local.value.videoStatus)
  }

  // 音频开关
  static async handleAudio() {
    if (!local.value.useAudio) {
      return
    }
    local.value.audioStatus = !local.value.audioStatus
    MediaServer.localAudioStream.getAudioTracks()[0].enabled = local.value.audioStatus
    MediaServer.sendLocalAudioStatus(local.value.audioStatus)
  }

  // 举手
  static switchHandStatus() {
    local.value.handStatus = !local.value.handStatus
    MediaServer.emitPeerStatus('hand', local.value.handStatus)
    if (local.value.handStatus) {
      playSound('raiseHand')
    }
  }

  // 屏幕共享
  static async switchScreenSharing(init: boolean = false) {
    try {
      local.value.screenStatus = !local.value.screenStatus

      if (!local.value.screenStatus) {
        MediaServer.localVideoStatusBefore = local.value.videoStatus
        console.log(`屏幕共享前的视频状态: ${MediaServer.localVideoStatusBefore}`)
      } else {
        if (!local.value.useAudio && !local.value.useVideo) {
          return MediaServer.screenSharingException('没有音频和视频设备, 不能共享屏幕', init)
        }
      }

      const constraints = await MediaServer.getAudioVideoConstraints()

      console.log('%cVideo AND Audio constraints', 'color:red;', constraints)

      // Get screen or webcam media stream based on current state
      const screenMediaPromise = await navigator.mediaDevices.getUserMedia(constraints)
      if (screenMediaPromise) {
        local.value.privacyStatus = false
        MediaServer.emitPeerStatus('privacy', local.value.privacyStatus)

        if (local.value.screenStatus) {
          MediaServer.setLocalVideoStatusTrue()
          await MediaServer.emitPeerAction('screenStart')
        } else {
          await MediaServer.emitPeerAction('screenStop')
        }

        await MediaServer.emitPeerStatus('screen', local.value.screenStatus)

        await MediaServer.stopLocalVideoTrack()
        await MediaServer.refreshLocalStream(screenMediaPromise, !local.value.useAudio)
        await MediaServer.refreshStreamToPeers(screenMediaPromise, !local.value.useAudio)

        if (init) {
          // Handle init media stream
          if (MediaServer.localVideoStream) {
            await MediaServer.stopTracks(MediaServer.localVideoStream)
          }
          MediaServer.localVideoStream = screenMediaPromise
          if (MediaServer.hasVideoTrack(MediaServer.localVideoStream)) {
            const newInitStream = new MediaStream([MediaServer.localVideoStream.getVideoTracks()[0]])
            MediaServer.videoElement.srcObject = newInitStream
          }
        }

        // Disable cam video when screen sharing stops
        if (!init && !local.value.screenStatus && !MediaServer.localVideoStatusBefore) {
          MediaServer.setLocalVideoOff()
        }
        // Enable cam video when screen sharing stops
        if (!init && !local.value.screenStatus && MediaServer.localVideoStatusBefore) {
          MediaServer.setLocalVideoStatusTrue()
        }

        if (local.value.screenStatus) {
          pinnedId.value = local.value.userId
        }
      }
    } catch (err) {
      if ((err as { name: string }).name === 'NotAllowedError') {
        console.error('Screen sharing permission was denied by the user.')
      } else {
        await MediaServer.screenSharingException(`[Warning] Unable to share the screen: ${err}`, init)
      }
    }
  }

  static async screenSharingException(reason: string, init: boolean) {
    try {
      console.warn('screenSharingException', reason)

      // Update video privacy status
      local.value.privacyStatus = false
      MediaServer.emitPeerStatus('privacy', local.value.privacyStatus)

      // Inform peers about screen sharing stop
      await MediaServer.emitPeerAction('screenStop')

      // Turn off your video
      MediaServer.setLocalVideoOff()

      // Toggle screen streaming status
      local.value.screenStatus = !local.value.screenStatus

      // Update screen sharing status 更新UI

      // Emit screen status to peers
      MediaServer.emitPeerStatus('screen', local.value.screenStatus)

      // Stop the local video track
      await MediaServer.stopLocalVideoTrack()

      // Handle video status based on conditions
      if (!init && !local.value.screenStatus && !MediaServer.localVideoStatusBefore) {
        MediaServer.setLocalVideoOff()
      } else if (!init && !local.value.screenStatus && MediaServer.localVideoStatusBefore) {
        MediaServer.setLocalVideoStatusTrue()
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
