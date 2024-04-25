<script setup>
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import ScreenSources from '../components/ScreenSources.vue'
import PeerStatusBar from './components/PeerStatusBar.vue'
import PeerVolumeBar from './components/PeerVolumeBar.vue'
import { useWebRTCClient } from '@/webrtc'
import { useWebrtcStore } from '@/store'

const webrtcStore = useWebrtcStore()
const router = useRouter()

const {
  local,
  remotePeers,
} = storeToRefs(webrtcStore)

const localVideo = ref(null)
const localAudio = ref(null)
const localVolume = ref(null)

const isMounted = useMounted()
const client = useWebRTCClient()

watchOnce(isMounted, () => {
  if (localVideo.value && localAudio.value) {
    client.mediaServer.init(localVideo.value, localAudio.value, localVolume.value)
    client.start()
  }
})

function toggleScreenSharing() {
  client.mediaServer.toggleScreenSharing()
}

function setVideoTracks() {
  client.mediaServer.handleVideo()
}

function setAudioTracks() {
  client.mediaServer.setAudioTracks(local.value.audioStatus)
}

// 举手
function onHandStatus() {
  client.mediaServer.onHandStatus()
}

// 全屏事件
function onFullscreenchange({ target }, peer) {
  console.log('Esc FS isVideoOnFullScreen', peer.fullScreen)

  if (target.controls) {
    return
  }
  const fullscreenElement = document.fullscreenElement
  if (!fullscreenElement) {
    target.style.pointerEvents = 'auto'
    peer.fullScreen = false
  }

  console.log('Esc FS isVideoOnFullScreen', peer.fullScreen)
}

// 退出
function onSignout() {
  router.push({ path: '/start' })
}
</script>

<template>
  <div class="room-page">
    <div class="main">
      <TransitionGroup name="cameraIn" tag="div" class="video-container">
        <div
          key="localVideo" class="camera"
          :class="[{ privacy: local.privacyStatus, hidden: local.hidden, pinned: local.pinnedId === local.userId }]"
        >
          <video
            ref="localVideo"
            class="video"
            :class="{ mirror: local.mirrorStatus }"
            muted
            autoplay
            playsinline="true"
            @fullscreenchange="onFullscreenchange($event, local)"
          />
          <div class="name">{{ local.userName }}(我)</div>
          <PeerStatusBar :peer="local" />
          <PeerVolumeBar :peer="local" />
        </div>
        <template v-for="(peer, userId) in remotePeers" :key="`remoteVideo${userId}`">
          <div class="camera" :class="[{ privacy: peer.privacyStatus, pinned: peer.pinnedId === peer.userId }]">
            <video
              class="video"
              :srcObject="peer.videoStream"
              :class="{ mirror: peer.mirrorStatus }"
              muted
              autoplay
              playsinline="true"
              @fullscreenchange="onFullscreenchange($event, peer)"
            />
            <div class="name">{{ peer.userName }}</div>
            <PeerStatusBar :peer="peer" />
            <PeerVolumeBar :peer="peer" />
          </div>
        </template>
      </TransitionGroup>
      <div class="audio-container">
        <div class="audio-wrap">
          <audio ref="localAudio" :srcObject="local.stream" autoplay muted />
        </div>
        <template v-for="(peer, userId) in remotePeers" :key="`remoteAudio${userId}`">
          <div class="audio-wrap">
            <audio :srcObject="peer.audioStream" autoplay muted />
          </div>
        </template>
      </div>
    </div>
    <div id="localVolume" ref="localVolume" class="volume-container">
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
    <Transition name="fadeLeftIn">
      <div v-if="isMounted" class="toolbar">
        <button>
          <i class="i-fa6-solid-share-nodes" />
        </button>
        <button @click="local.hidden = !local.hidden">
          <i v-if="local.hidden" class="i-fa6-solid-user-slash color-red" />
          <i v-else class="i-fa6-solid-user" />
        </button>
        <button>
          <i class="i-fa6-solid-camera-rotate" />
        </button>
        <button @click="setVideoTracks()">
          <i v-if="local.videoStatus" class="i-fa6-solid-video" />
          <i v-else class="i-fa6-solid-video-slash color-red" />
        </button>
        <button @click="setAudioTracks()">
          <i v-if="local.audioStatus" class="i-fa6-solid-microphone" />
          <i v-else class="i-fa6-solid-microphone-slash color-red" />
        </button>
        <ScreenSources :peer="local" @change="toggleScreenSharing()">
          <button>
            <i v-if="local.screenStatus" class="i-fa6-solid-circle-stop" />
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
        <button @click="onHandStatus()">
          <i class="i-fa6-solid-hand" :class="{ 'color-green': local.handStatus }" />
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
  .main {
    flex: 1;
    width: 100%;
    min-height: 0;
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
        flex: 1 1 140px;
        min-width: 140px;
        min-height: 140px;
        height: 100%;
        overflow: hidden;
        display: inline-block;
        position: relative;
        background: radial-gradient(#393939, #000000);
        box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
        border-radius: 10px;
        transition: all 0.5s ease-in-out;
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
          &:hover {
            opacity: 0.9;
          }
          &.mirror {
            transform: rotateY(180deg);
          }
        }
        &.hidden {
          display: none;
        }
        &.privacy {
          width: 120px;
          height: 120px;
          flex: unset;
          border-radius: 50%;
          .video {
            object-fit: cover;
          }
        }
        &.pinned {
          order: -1;
          flex: 0 0 auto;
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
          padding: 0 8px;
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

  .toolbar {
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
}
</style>
