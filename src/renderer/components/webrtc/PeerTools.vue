<script setup>
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useWebrtcStore } from '@/store'
import { Client, MediaServer } from '@/webrtc'

defineOptions({
  name: 'PeerTools',
})

const webrtcStore = useWebrtcStore()
const router = useRouter()

const {
  local,
  fullScreen,
  showRecord,
  showWhiteboard,
} = storeToRefs(webrtcStore)

const isMounted = useMounted()

// 举手
function switchHandStatus() {
  MediaServer.switchHandStatus()
}

// 窗口全屏
function onFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    fullScreen.value = true
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen()
      fullScreen.value = false
    }
  }
}

// 退出
function onSignout() {
  router.push({ path: '/start' })
}
</script>

<template>
  <Transition name="fadeLeftIn">
    <div v-if="isMounted" class="peer-toolbar">
      <button>
        <i class="i-fa6-solid-share-nodes" />
      </button>
      <button @click.stop="local.hidden = !local.hidden">
        <i v-if="local.hidden" class="i-fa6-solid-user-slash color-red" />
        <i v-else class="i-fa6-solid-user" />
      </button>
      <button>
        <i class="i-fa6-solid-camera-rotate" />
      </button>
      <button @click.stop="MediaServer.handleVideo()">
        <i v-if="local.videoStatus" class="i-fa6-solid-video" />
        <i v-else class="i-fa6-solid-video-slash color-red" />
      </button>
      <button @click.stop="MediaServer.handleAudio()">
        <i v-if="local.audioStatus" class="i-fa6-solid-microphone" />
        <i v-else class="i-fa6-solid-microphone-slash color-red" />
      </button>
      <ScreenSources :peer="local" @change="MediaServer.switchScreenSharing()">
        <button>
          <i v-if="local.screenStatus" class="i-fa6-solid-circle-stop" />
          <i v-else class="i-fa6-solid-desktop" />
        </button>
      </ScreenSources>
      <button @click.stop="showRecord = !showRecord">
        <i class="i-fa6-solid-record-vinyl" :class="{ 'color-red': showRecord }" />
      </button>
      <button @click.stop="onFullScreen()">
        <i v-if="fullScreen" class="i-fa6-solid-down-left-and-up-right-to-center" />
        <i v-else class="i-fa6-solid-up-right-and-down-left-from-center" />
      </button>
      <button>
        <i class="i-fa6-solid-comment" />
      </button>
      <button>
        <i class="i-fa6-solid-closed-captioning" />
      </button>
      <button>
        <i class="i-fa6-solid-face-smile" />
      </button>
      <button @click="switchHandStatus()">
        <i class="i-fa6-solid-hand" :class="{ 'color-green': local.handStatus }" />
      </button>
      <button @click="showWhiteboard = !showWhiteboard">
        <i class="i-fa6-solid-chalkboard-user" :class="{ 'color-red': showWhiteboard }" />
      </button>
      <button>
        <i class="i-fa6-solid-folder-open" />
      </button>
      <button>
        <i class="i-fa6-solid-images" />
      </button>
      <button>
        <i class="i-fa6-solid-gears" />
      </button>
      <button>
        <i class="i-fa6-solid-question" />
      </button>
      <button @click="onSignout()">
        <i class="i-fa6-solid-right-from-bracket" />
      </button>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.peer-toolbar {
  gap: 6px;
  padding: 10px;
  display: inline-flex;
  align-items: center;
  box-shadow: 0px 8px 16px 0px rgb(33 33 33);
  border: 0.5px solid rgb(255 255 255 / 32%);
  border-radius: 10px;
  margin: 10px auto;
  overflow: hidden;
  button {
    color: #666;
    padding: 5px;
    font-size: 20px;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    border-radius: 5px;
    background: #fff;
    transition: all 0.3s ease-in-out;
    &:hover {
      color: #000;
      transform: scale(1.2);
    }
  }
}
</style>
