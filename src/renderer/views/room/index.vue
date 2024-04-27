<script setup>
import { storeToRefs } from 'pinia'
import { Client, MediaServer } from '@/webrtc'
import { useWebrtcStore } from '@/store'

const webrtcStore = useWebrtcStore()

const {
  local,
  pinnedId,
  fullScreen,
  remotePeers,
} = storeToRefs(webrtcStore)

const localVideoElement = ref(null)
const localAudioElement = ref(null)
const localVolumeElement = ref(null)

const isMounted = useMounted()

watchOnce(isMounted, () => {
  if (localVideoElement.value && localAudioElement.value) {
    MediaServer.start(localVideoElement.value, localAudioElement.value, localVolumeElement.value)
    Client.start()
  }
})

// 视频全屏 change
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

// 窗口全屏 change
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    fullScreen.value = false
  }
})
</script>

<template>
  <div class="room-page">
    <div class="main">
      <TransitionGroup name="cameraIn" tag="div" class="video-container">
        <div
          key="localCamera" class="camera"
          :class="[{ privacy: local.privacyStatus, hidden: local.hidden, pinned: pinnedId === local.userId }]"
        >
          <video
            ref="localVideoElement"
            class="video"
            :class="{ mirror: local.mirrorStatus }"
            :style="{ display: local.videoStatus ? 'block' : 'none' }"
            autoplay
            playsinline="true"
            @fullscreenchange="onFullscreenchange($event, local)"
          />
          <div class="name">{{ local.userName }}(我)</div>
          <PeerStatusBar :peer="local" />
          <PeerVolumeBar :peer="local" />
        </div>
        <template v-for="(peer, userId) in remotePeers" :key="`remoteVideo${userId}`">
          <div class="camera" :class="[{ privacy: peer.privacyStatus, pinned: pinnedId === peer.userId }]">
            <video
              class="video"
              :srcObject="peer.videoStream"
              :class="{ mirror: peer.mirrorStatus }"
              :style="{ display: peer.videoStatus ? 'block' : 'none' }"
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
          <audio ref="localAudioElement" autoplay />
        </div>
        <template v-for="(peer, userId) in remotePeers" :key="`remoteAudio${userId}`">
          <div class="audio-wrap">
            <PeerAudioOutput :peer="peer" />
          </div>
        </template>
      </div>
    </div>
    <div id="localVolume" ref="localVolumeElement" class="volume-container">
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
    <PeerTools />
    <PeerActions />
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
      position: relative;
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
          flex: 1 0 auto;
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
}
</style>
