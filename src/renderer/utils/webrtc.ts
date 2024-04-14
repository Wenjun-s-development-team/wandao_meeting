import { getAudioConstraints, getVideoConstraints } from './media'
import { IPCRequest } from '@/api'

export function useClientMedia(options: UseMediaOptions = {}) {
  const enabled = ref(options.enabled ?? false)
  const autoSwitch = ref(options.autoSwitch ?? true)
  const useScreen = ref(options.useScreen ?? false)
  const useVideo = ref(options.useVideo ?? true)
  const useAudio = ref(options.useAudio ?? true)
  const videoInputDeviceId = ref(options.videoInputDeviceId ?? '')
  const audioInputDeviceId = ref(options.audioInputDeviceId ?? '')

  const isSupported = useSupported(() => window.navigator?.mediaDevices?.getUserMedia)

  const stream: Ref<MediaStream | undefined> = shallowRef()

  function getDeviceOptions() {
    return {
      video: getVideoConstraints(videoInputDeviceId.value),
      audio: getAudioConstraints(audioInputDeviceId.value),
    }
  }

  function setMediaEnabled() {
    if (stream.value) {
      stream.value.getTracks().forEach((track) => {
        if (track.kind === 'video') {
          track.enabled = useVideo.value
        } else if (track.kind === 'audio') {
          track.enabled = useAudio.value
        }
      })
    }
  }

  async function _start() {
    if (!isSupported.value) {
      return
    }
    if (useScreen.value) {
      const { sources } = await IPCRequest.system.getSources()
      stream.value = await window.navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          // eslint-disable-next-line ts/ban-ts-comment
          // @ts-expect-error
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sources[0].id,
          },
        },
      })
    } else {
      stream.value = await window.navigator!.mediaDevices.getUserMedia(getDeviceOptions())
    }
    setMediaEnabled()
    return stream.value
  }

  function _stop() {
    stream.value?.getTracks().forEach(t => t.stop())
    stream.value = undefined
  }

  function stop() {
    _stop()
    enabled.value = false
  }

  async function start() {
    await _start()
    if (stream.value) {
      enabled.value = true
    }
    return stream.value
  }

  async function restart() {
    _stop()
    return await start()
  }

  // 监听 屏幕共享、设备切换 - 需要重新创建 stream
  watch([useScreen, videoInputDeviceId, audioInputDeviceId], () => {
    if (autoSwitch.value) {
      restart()
    }
  })

  // 监听 音频视频 启用/禁用 - 不需要重新创建 stream
  watch([useVideo, useAudio], () => {
    setMediaEnabled()
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
    autoSwitch,
  }
}
