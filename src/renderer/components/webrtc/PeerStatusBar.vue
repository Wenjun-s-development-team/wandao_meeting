<script setup>
import { storeToRefs } from 'pinia'
import { playSound, saveDataToFile, secondsToHms } from '@/utils'
import { useWebrtcStore } from '@/store'

defineOptions({
  name: 'PeerStatusBar',
})

const props = defineProps(['peer'])
const webrtcStore = useWebrtcStore()

const {
  userId,
  pinnedId,
} = storeToRefs(webrtcStore)

const { peer } = toRefs(props)

const peerRef = ref()

// 快照
function onSnapshot() {
  playSound('snapshot')
  // 直接 DOM API 获取 video 元素
  const video = peerRef.value.parentNode.querySelector('video')
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  saveDataToFile(canvas.toDataURL('image/png'), `${Date.now()}-SNAPSHOT.png`)
}

// 全屏
function onFullScreen() {
  const video = peerRef.value.parentNode.querySelector('video')
  if (video.controls) {
    return false
  }
  if (!peer.value.fullScreen) {
    if (video.requestFullscreen) {
      video.requestFullscreen()
      peer.value.fullScreen = true
      video.style.pointerEvents = 'none'
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen()
    }
    peer.value.fullScreen = false
    video.style.pointerEvents = 'auto'
  }
}

// PIP 画中画
function onPictureInPicture() {
  const video = peerRef.value.parentNode.querySelector('video')
  if (video.pictureInPictureElement) {
    video.exitPictureInPicture()
  } else if (document.pictureInPictureEnabled) {
    if (!peer.value.videoStatus) {
      return ElMessage.warning({
        grouping: true,
        message: '视频未启用，禁此画中画(PIP)',
      })
    }
    video.requestPictureInPicture().catch((error) => {
      console.error('Failed to enter Picture-in-Picture mode:', error)
      return ElMessage.warning({
        grouping: true,
        message: error.message,
      })
    })
  }
}

// 固定住
function onPinned() {
  if (pinnedId.value === peer.value.userId) {
    pinnedId.value = 0
  } else {
    pinnedId.value = peer.value.userId
  }
}

// 音量
function onAudioVolume(event) {
  peer.value.volume = event.target.value / 100
}

// 时间
const sessionTime = ref('')
const callElapsedTime = ref(0)
onMounted(() => {
  setInterval(() => {
    callElapsedTime.value++
    sessionTime.value = secondsToHms(callElapsedTime.value)
  }, 1000)
})
</script>

<template>
  <div ref="peerRef" class="peer-statusbar">
    <button class="unhover">{{ sessionTime }}</button>
    <button @click.stop="onPinned()">
      <i class="i-fa6-solid-map-pin" :class="{ 'color-green': pinnedId === peer.userId }" />
    </button>
    <button @click.stop="peer.mirrorStatus = !peer.mirrorStatus">
      <i class="i-fa6-solid-arrow-right-arrow-left" />
    </button>
    <button @click.stop="onPictureInPicture()"><i class="i-fa6-solid-images" /></button>
    <button @click.stop="onFullScreen()"><i class="i-fa6-solid-expand" /></button>
    <button @click.stop="onSnapshot()"><i class="i-fa6-solid-camera-retro" /></button>
    <button @click.stop="peer.privacyStatus = !peer.privacyStatus"><i class="i-fa6-solid-circle" /></button>
    <button>
      <i v-if="peer.videoStatus" class="i-fa6-solid-video" />
      <i v-else class="i-fa6-solid-video-slash color-red" />
    </button>
    <button>
      <i v-if="peer.audioStatus" class="i-fa6-solid-microphone" />
      <i v-else class="i-fa6-solid-microphone-slash color-red" />
    </button>
    <template v-if="peer.userId !== userId && peer.audioStatus">
      <input type="range" min="0" max="100" class="audioVolume" @input="onAudioVolume">
    </template>
    <button v-if="peer.handStatus">
      <i class="i-fa6-solid-hand color-green" />
    </button>
  </div>
</template>

<style lang="scss" scoped>
.peer-statusbar {
  gap: 5px;
  z-index: 8;
  top: 0;
  left: 0;
  right: 0;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 15px;
  position: absolute;
  border-radius: 10px 10px 0 0;
  background: rgba(0, 0, 0, 0.2);
  button {
    display: inline;
    padding: 5px;
    font-size: small;
    text-decoration: none;
    border-radius: 3px;
    background: transparent;
    color: #fff;
    &:not(.unhover) {
      width: 26px;
      height: 26px;
      &:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    }
  }

  .audioVolume {
    cursor: pointer;
    max-width: 40px;
  }
}
</style>
