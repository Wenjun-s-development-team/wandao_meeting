import { IPCRequest } from '@/api'

/**
 * Stop tracks from stream
 * @param {object} stream
 */
export function stopTracks(stream: MediaStream): void {
  stream.getTracks().forEach((track) => {
    track.stop()
  })
}

/**
 * 获取 Video 参数
 *
 * @export
 * @param {string} deviceId 设备ID
 * @param {FrameRate} [frameRate={ ideal: 30 }] 每秒帧数
 * @param {('default' | 'qvgaVideo' | 'vgaVideo' | 'hdVideo' | 'fhdVideo' | '2kVideo' | '4kVideo')} [quality='default'] 画质
 * @param {boolean} [forceFps=false] 是否强制 webCam 达到最大分辨率，最高可达4k和60fps
 * @return {*}  {MediaTrackConstraints}
 */
export function getVideoConstraints(
  deviceId: string,
  frameRate: FrameRate = { ideal: 30 },
  quality:
    | 'default'
    | 'qvgaVideo'
    | 'vgaVideo'
    | 'hdVideo'
    | 'fhdVideo'
    | '2kVideo'
    | '4kVideo' = 'default',
  forceFps: boolean = false
): MediaTrackConstraints {
  let constraints

  switch (quality) {
    case 'default':
      if (forceFps) {
        constraints = {
          width: { ideal: 3840 },
          height: { ideal: 2160 },
          frameRate: { ideal: 60 }
        }
      } else {
        constraints = {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }
      }
      break
    case 'qvgaVideo':
      constraints = {
        width: { exact: 320 },
        height: { exact: 240 },
        frameRate
      }
      break
    case 'vgaVideo':
      constraints = {
        width: { exact: 640 },
        height: { exact: 480 },
        frameRate
      }
      break
    case 'hdVideo':
      constraints = {
        width: { exact: 1280 },
        height: { exact: 720 },
        frameRate
      }
      break
    case 'fhdVideo':
      constraints = {
        width: { exact: 1920 },
        height: { exact: 1080 },
        frameRate
      }
      break
    case '2kVideo':
      constraints = {
        width: { exact: 2560 },
        height: { exact: 1440 },
        frameRate
      }
      break
    case '4kVideo':
      constraints = {
        width: { exact: 3840 },
        height: { exact: 2160 },
        frameRate
      }
      break
    default:
      break
  }
  constraints.deviceId = deviceId
  console.log('Video constraints', constraints)
  return constraints
}

/**
 * 获取 Audio 参数
 *
 * @param {string} deviceId 设备ID
 * @return {*}  {MediaStreamConstraints}
 * @memberof WebrtcClient
 */
export function getAudioConstraints(deviceId: string): MediaTrackConstraints {
  const constraints = {
    deviceId,
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
    volume: 100 / 100
  }
  console.log('Audio constraints', constraints)
  return constraints
}

export function useMedia(options: UseMediaOptions = {}) {
  const enabled = ref(options.enabled ?? false)
  const autoSwitch = ref(options.autoSwitch ?? true)
  const useScreen = ref(options.useScreen ?? false)
  const useVideo = ref(options.useVideo ?? true)
  const useAudio = ref(options.useAudio ?? true)
  const videoInputDeviceId = ref(options.videoInputDeviceId ?? '')
  const audioInputDeviceId = ref(options.audioInputDeviceId ?? '')

  const isSupported = useSupported(() =>
    useScreen.value
      ? window.navigator?.mediaDevices?.getUserMedia
      : window.navigator?.mediaDevices?.getDisplayMedia
  )

  const stream: Ref<MediaStream | undefined> = shallowRef()

  function getDeviceOptions(type: 'video' | 'audio') {
    switch (type) {
      case 'video': {
        if (videoInputDeviceId.value && useVideo.value)
          return getVideoConstraints(videoInputDeviceId.value) || false
        break
      }
      case 'audio': {
        if (audioInputDeviceId.value && useAudio.value)
          return getAudioConstraints(audioInputDeviceId.value) || false
        break
      }
    }
    return false
  }

  async function _start() {
    if (!isSupported.value) return
    if (useScreen.value) {
      const { data } = await IPCRequest.system.getSources()
      console.log('getSources', data)
      stream.value = await navigator.mediaDevices.getUserMedia({
        audio: getDeviceOptions('video'),
        video: {
          // @ts-ignore
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: data[0].id
          }
        }
      })
      // stream.value = await window.navigator!.mediaDevices.getDisplayMedia({
      //   video: getDeviceOptions('video'),
      //   audio: getDeviceOptions('audio')
      // })
    } else {
      stream.value = await window.navigator!.mediaDevices.getUserMedia({
        video: getDeviceOptions('video'),
        audio: getDeviceOptions('audio')
      })
    }

    return stream.value
  }

  function _stop() {
    stream.value?.getTracks().forEach((t) => t.stop())
    stream.value = undefined
  }

  function stop() {
    _stop()
    enabled.value = false
  }

  async function start() {
    await _start()
    if (stream.value) enabled.value = true
    return stream.value
  }

  async function restart() {
    _stop()
    return await start()
  }

  // 监听 屏幕共享、设备切换 - 需要重新创建 stream
  watch(
    [useScreen, videoInputDeviceId, audioInputDeviceId],
    () => {
      if (autoSwitch.value) restart()
    },
    { immediate: true }
  )

  // 监听 音频视频 启用/禁用 - 不需要重新创建 stream
  watch([useVideo, useAudio], () => {
    if (stream.value) {
      stream.value.getTracks().forEach((track) => {
        if (track.kind === 'video') {
          track.enabled = useVideo.value
        } else if (track.kind === 'audio') {
          track.enabled = useAudio.value
        }
      })
    }
  })

  tryOnScopeDispose(() => {
    stop()
  })

  return {
    isSupported,
    stream,
    start,
    stop,
    restart,
    enabled,
    autoSwitch
  }
}
