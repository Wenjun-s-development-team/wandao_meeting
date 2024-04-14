/**
 * 获取 Video 参数
 *
 * @export
 * @param {string} deviceId 设备ID
 * @param {FrameRate} [frameRate] 每秒帧数
 * @param {('default' | 'qvgaVideo' | 'vgaVideo' | 'hdVideo' | 'fhdVideo' | '2kVideo' | '4kVideo')} [quality] 画质
 * @param {boolean} [forceFps] 是否强制 webCam 达到最大分辨率，最高可达4k和60fps
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
  forceFps: boolean = false,
): boolean | MediaTrackConstraints {
  if (!deviceId) {
    return false
  }

  let constraints

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
export function getAudioConstraints(deviceId: string): boolean | MediaTrackConstraints {
  if (!deviceId) {
    return false
  }
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
    volume: 100 / 100,
  }
  console.log('Audio constraints', constraints)
  return constraints
}
