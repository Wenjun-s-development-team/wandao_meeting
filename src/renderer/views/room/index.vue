<script setup>
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import ScreenSources from '../components/ScreenSources.vue'
import RoomStatusBar from './components/RoomStatusBar.vue'
import { useWebRTCClient } from '@/webrtc'
import { useWebrtcStore } from '@/store'

const webrtcStore = useWebrtcStore()
const router = useRouter()

const {
  useScreen,
  screenId,
  remoteVideo,
  remoteAudio,
} = storeToRefs(webrtcStore)

const localVideo = ref(null)
const localAudio = ref(null)
const localVolume = ref(null)

const useMirror = ref(false)
const isMounted = useMounted()
const client = useWebRTCClient()

watchOnce(isMounted, () => {
  if (localVideo.value && localAudio.value) {
    client.mediaServer.init(localVideo.value, localAudio.value, localVolume.value)
    client.mediaServer.listen()
    client.start()
  }
})

function onSignout() {
  router.push({ path: '/start' })
}
</script>

<template>
  <div class="room-page">
    <Transition name="fadeLeftIn">
      <div v-if="isMounted" class="toolbar">
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
        <ScreenSources v-model="screenId" v-model:useScreen="useScreen">
          <button>
            <i v-if="useScreen" class="i-fa6-solid-circle-stop" />
            <i v-else class="i-fa6-solid-desktop" />
          </button>
        </ScreenSources>
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
        <button @click="onSignout()">
          <i class="i-fa6-solid-right-from-bracket" />
        </button>
      </div>
    </Transition>
    <div ref="localVolume" class="volume-container">
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
      <TransitionGroup name="cameraIn" tag="div" class="video-container">
        <div key="localVideo" class="camera">
          <RoomStatusBar />
          <video
            ref="localVideo"
            class="video"
            :class="{ mirror: useMirror }"
            muted
            autoplay
            playsinline="true"
            poster="../../assets/images/loader.gif"
          />
          <div class="name">我</div>
        </div>
        <template v-for="(video, index) in remoteVideo" :key="`remoteVideo${index}`">
          <div class="camera">
            <RoomStatusBar />
            <video
              class="video"
              :srcObject="video.stream"
              muted
              autoplay
              playsinline="true"
              poster="../../assets/images/loader.gif"
            />
            <div class="name">{{ video.userId }}</div>
          </div>
        </template>
      </TransitionGroup>
      <div class="audio-container">
        <div class="audio-wrap">
          <audio ref="localAudio" autoplay muted :volume="0" />
        </div>
        <template v-for="(audio, index) in remoteAudio" :key="index">
          <div class="audio-wrap">
            <audio autoplay muted :volume="0" />
          </div>
        </template>
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
      gap: 10px;
      width: 100%;
      height: 100%;
      z-index: 2;
      display: flex;
      padding: 10px;
      border-radius: 5px;
      align-content: center;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
      overflow: hidden;
      .camera {
        flex: 1;
        vertical-align: middle;
        align-self: center;
        overflow: hidden;
        display: inline-block;
        position: relative;
        background: radial-gradient(#393939, #000000);
        box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
        border-radius: 10px;
        .video {
          z-index: 0;
          width: 100%;
          height: 100%;
          position: relative;
          border-radius: 10px;
          object-fit: cover;
          transform-origin: center center;
          transform: rotateY(0deg);
          transition: transform 0.3s ease-in-out;
          &.mirror {
            transform: rotateY(180deg);
          }
        }
        .name {
          z-index: 8;
          right: 0;
          bottom: 0;
          color: #fff;
          font-size: 12px;
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 5px;
          width: auto;
          height: 25px;
          min-width: 40px;
          position: absolute;
          border-radius: 5px;
          background: rgba(0, 0, 0, 0.3);
          transition: all 0.5s;
          &:hover {
            background: rgba(0, 0, 0, 0.8);
          }
        }
      }
    }
    .audio-container {
      display: none;
    }
  }
}
</style>
