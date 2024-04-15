import { defineStore } from 'pinia'

export const useWebrtcStore = defineStore('webrtcStore', {
  state: () => {
    return {
      lastRoomId: '',
      useMirror: false,
      useScreen: false,
      useAudio: true,
      useVideo: true,
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
