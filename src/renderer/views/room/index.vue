<script setup>
import { Client } from '@/webrtc'

const videoElement = ref(null)
const audioElement = ref(null)
const volumeElement = ref(null)

const useMirror = ref(false)
const isMounted = useMounted()

watchOnce(isMounted, () => {
  if (videoElement.value && audioElement.value) {
    const client = new Client()
    client.mediaServer.init(videoElement.value, audioElement.value, volumeElement.value)
    client.start()
  }
})

const showToolBar = ref(false)
const showStatusBar = ref(false)

onMounted(() => {
  showToolBar.value = true
  showStatusBar.value = true
})
</script>

<template>
  <div class="room-page">
    <Transition name="fadeTopIn">
      <div v-if="showStatusBar" class="statusbar">
        <button class="unhover">39m 20s</button>
        <button><i class="i-fa6-solid-map-pin" /></button>
        <button><i class="i-fa6-solid-arrow-right-arrow-left" /></button>
        <button><i class="i-fa6-solid-images" /></button>
        <button><i class="i-fa6-solid-expand" /></button>
        <button><i class="i-fa6-solid-camera-retro" /></button>
        <button><i class="i-fa6-solid-circle" /></button>
        <button><i class="i-fa6-solid-video" /></button>
        <button><i class="i-fa6-solid-microphone" /></button>
      </div>
    </Transition>
    <Transition name="fadeLeftIn">
      <div v-if="showToolBar" class="toolbar">
        <button>
          <i class="i-fa6-solid-share-nodes" />
        </button>
        <button>
          <i class="i-fa6-solid-user" />
        </button>
        <button>
          <i class="i-fa6-solid-camera-rotate" />
        </button>
        <button>
          <i class="i-fa6-solid-video" />
        </button>
        <button>
          <i class="i-fa6-solid-microphone" />
        </button>
        <button>
          <i class="i-fa6-solid-desktop" />
        </button>
        <button>
          <i class="i-fa6-solid-record-vinyl" />
        </button>
        <button>
          <i class="i-fa6-solid-up-right-and-down-left-from-center" />
          <!-- i-fa6-solid-down-left-and-up-right-to-center -->
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
        <button>
          <i class="i-fa6-solid-hand" />
        </button>
        <button>
          <i class="i-fa6-solid-chalkboard-user" />
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
        <button>
          <i class="i-fa6-solid-right-from-bracket" />
        </button>
      </div>
    </Transition>
    <div ref="volumeElement" class="volume-container">
      <div class="volume-bar" />
      <div class="volume-bar" />
      <div class="volume-bar" />
      <div class="volume-bar" />
      <div class="volume-bar" />
      <div class="volume-bar" />
      <div class="volume-bar" />
      <div class="volume-bar" />
      <div class="volume-bar" />
      <div class="volume-bar" />
    </div>
    <div class="main">
      <div class="video-container">
        <video
          ref="videoElement"
          class="swal2-video"
          :class="{ mirror: useMirror }"
          muted
          autoplay
          playsinline="true"
          poster="../../assets/images/loader.gif"
        />
      </div>
      <div class="audio-container">
        <audio ref="audioElement" autoplay muted :volume="0" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.room-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  background: radial-gradient(#393939, #000000);
  .statusbar {
    gap: 5px;
    z-index: 8;
    top: 38px;
    left: 5px;
    right: 5px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 15px;
    position: fixed;
    border-radius: 5px 5px 0 0;
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
  }
  .toolbar {
    z-index: 10;
    display: flex;
    position: fixed;
    padding: 10px;
    bottom: 20px;
    left: 15px;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    box-shadow: 0px 8px 16px 0px rgb(33 33 33);
    border: 0.5px solid rgb(255 255 255 / 32%);
    border-radius: 10px;
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
  .main {
    flex: 1;
    position: relative;
    .video-container {
      margin: 5px;
      border-radius: 5px;
      overflow: hidden;
      .swal2-video {
        z-index: 0;
        width: 100%;
        height: 100%;
        position: relative;
        border-radius: 10px;
        object-fit: contain;
        transform-origin: center center;
        transform: rotateY(0deg);
        transition: transform 0.3s ease-in-out;
        &.mirror {
          transform: rotateY(180deg);
        }
      }
    }
  }
}
</style>
