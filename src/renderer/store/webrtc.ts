import { defineStore } from 'pinia'

export const useWebrtcStore = defineStore('webrtcStore', {
  state: () => {
    return {
      lastRoomId: '', // 最近访问的房号
      useMirror: false, // 是否翻转视频
      useAudio: true, // 启用/禁用 音频
      useVideo: true, // 启用/禁用 视频
      useScreen: false, // 是否共享屏幕
      screenId: '', // 共享屏幕源ID
      videoInputDeviceId: '', // 视频输出设备ID
      audioInputDeviceId: '', // 音频输出设备ID
      audioOutputDeviceId: '', // 音频输入设备ID
      videoInputDevices: <MediaDeviceInfo[]>[], // 视频输出设备
      audioInputDevices: <MediaDeviceInfo[]>[], // 音频输出设备
      audioOutputDevices: <MediaDeviceInfo[]>[], // 音频输入设备

      handStatus: false, // 手状态和图标
      recordStatus: false, // 是否录音
      privacyStatus: false,

      // 连接状态 '🟢' '🔴'
      iceNetwork: { host: false, stun: false, turn: false },
    }
  },
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'webrtc',
        storage: localStorage,
        paths: ['lastRoomId', 'useAudio', 'useVideo'],
      },
    ],
  },
})
