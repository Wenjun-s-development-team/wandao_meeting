import { defineStore } from 'pinia'
import { RTCRequest } from '@/api'

export const useWebrtcStore = defineStore('webrtcStore', {
  state: () => {
    return {
      lastRoomId: 0, // 最近访问的房号
      screenId: '', // 共享屏幕源ID
      videoInputDeviceId: '', // 视频输出设备ID
      audioInputDeviceId: '', // 音频输出设备ID
      audioOutputDeviceId: '', // 音频输入设备ID
      videoInputDevices: <MediaDeviceInfo[]>[], // 视频输出设备
      audioInputDevices: <MediaDeviceInfo[]>[], // 音频输出设备
      audioOutputDevices: <MediaDeviceInfo[]>[], // 音频输入设备

      // 连接状态 '🟢' '🔴'
      iceNetwork: { host: false, stun: false, turn: false },

      // 用户相关
      token: '',
      userId: 0,
      userName: '',
      userAlias: '',

      // 本地媒体
      local: {
        roomId: 101, // 房间ID
        roomName: '', // 房间名称
        roomLock: false, // 房间锁
        roomPasswd: '', // 房间密码

        userId: 0, // 用户ID
        userName: '', // 用户名
        userLock: false, // 用户锁

        useAudio: true, // 启用/禁用 音频
        useVideo: true, // 启用/禁用 视频
        useMirror: false, // 是否翻转视频
        useScreen: false, // 是否共享屏幕

        handStatus: false, // 手状态和图标
        recordStatus: false, // 是否录音
        privacyStatus: false, // 是否小视图
      },
      // 远程媒体
      remoteVideo: <KeyValue[]>[],
      remoteAudio: <KeyValue[]>[],
    }
  },
  actions: {
    setRemoteVideo(data: KeyValue) {
      const index = this.remoteVideo.findIndex(item => item.userId === data.userId)
      if (index >= 0) {
        this.remoteVideo[index] = data
      } else {
        this.remoteVideo.push(data)
      }
    },
    setRemoteAudio(data: KeyValue) {
      const index = this.remoteAudio.findIndex(item => item.userId === data.userId)
      if (index >= 0) {
        this.remoteAudio[index] = data
      } else {
        this.remoteAudio.push(data)
      }
    },
    async userLogin(param: KeyValue): Promise<any> {
      const { data } = await RTCRequest.post('/login', param)
      this.token = data.token
      this.userId = data.user.id
      this.userName = data.user.alias || data.user.name
      this.userAlias = data.user.alias

      this.local.userId = data.user.id
      this.local.userName = data.user.alias || data.user.name
      return data
    },
    async userInfo(): Promise<any> {
      const { data } = await RTCRequest.get('/user/info')
      this.userId = data.id
      this.userName = data.alias || data.name
      this.userAlias = data.alias

      this.local.userId = data.id
      this.local.userName = data.alias || data.name
      return data
    },
    userLogout() {
      this.token = ''
      this.userId = 0
      this.userName = ''
      this.userAlias = ''
    },
  },
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'webrtc',
        storage: localStorage,
        paths: ['lastRoomId', 'token', 'local', 'userId'],
      },
    ],
  },
})
