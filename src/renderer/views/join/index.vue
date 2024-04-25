<script setup>
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import ScreenSources from '../components/ScreenSources.vue'
import DeviceSelect from './components/DeviceSelect.vue'
import { useMediaServer } from '@/webrtc/media'
import { IPCRequest, RTCRequest } from '@/api'

import { useWebrtcStore } from '@/store'

const webrtcStore = useWebrtcStore()

const router = useRouter()
const query = useUrlSearchParams('hash')

const videoElement = ref(null)
const audioElement = ref(null)

const {
  local,
  videoInputDeviceId,
  audioInputDeviceId,
  audioOutputDeviceId,
  videoInputDevices,
  audioInputDevices,
  audioOutputDevices,
} = storeToRefs(webrtcStore)

const isMounted = useMounted()
const mediaServer = useMediaServer()
watchOnce(isMounted, async () => {
  if (videoElement.value && audioElement.value) {
    await mediaServer.init(videoElement.value, audioElement.value).start()
    // mediaServer.listen()
  }
})

async function userLogin(name) {
  await webrtcStore.userLogin({ name, passwd: '123456' })
  router.push({ path: '/room', query: { roomId: query.roomId } })
}

function toggleScreenSharing() {
  mediaServer.toggleScreenSharing(false)
}

IPCRequest.windows.openDevTools()
</script>

<template>
  <div class="join-page">
    <div class="page-popup">
      <h2 class="page-title">
        <span>Meeting P2P</span>
        <button class="page-close" @click="router.back()"><i class="i-fa6-solid-xmark" /></button>
      </h2>
      <div class="page-html-container">
        <div class="media-container">
          <video
            ref="videoElement"
            class="page-video"
            :class="{ mirror: local.mirrorStatus }"
            autoplay
            playsinline="true"
            poster="../../assets/images/loader.gif"
          />
          <audio ref="audioElement" autoplay muted />
        </div>
        <div class="page-actions">
          <div class="buttons">
            <button @click="local.videoStatus = !local.videoStatus">
              <i v-if="local.videoStatus" class="i-fa6-solid-video" />
              <i v-else class="i-fa6-solid-video-slash color-red" />
            </button>
            <button @click="local.audioStatus = !local.audioStatus">
              <i v-if="local.audioStatus" class="i-fa6-solid-microphone" />
              <i v-else class="i-fa6-solid-microphone-slash color-red" />
            </button>
            <ScreenSources :peer="local" @change="toggleScreenSharing()">
              <button>
                <i v-if="local.screenStatus" class="i-fa6-solid-circle-stop" />
                <i v-else class="i-fa6-solid-desktop" />
              </button>
            </ScreenSources>
            <button @click="local.mirrorStatus = !local.mirrorStatus">
              <i class="i-fa6-solid-arrow-right-arrow-left" :class="{ 'color-green': local.mirrorStatus }" />
            </button>
          </div>
          <DeviceSelect
            v-model="videoInputDeviceId"
            :devices="videoInputDevices"
            :disabled="!local.videoStatus"
          />
          <DeviceSelect
            v-model="audioInputDeviceId"
            :devices="audioInputDevices"
            :disabled="!local.audioStatus"
          />
          <DeviceSelect
            v-model="audioOutputDeviceId"
            :devices="audioOutputDevices"
            :disabled="!local.audioStatus"
          />
        </div>
      </div>
      <input class="page-input" disabled maxlength="32" placeholder="请输入您的名称">
      <div class="page-footer">
        <button class="page-confirm" @click="userLogin('admin')">进 入 会 议(admin)</button>
        <button class="page-confirm" @click="userLogin('elkon')">进 入 会 议(elkon)</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.join-page {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  align-content: center;
  justify-content: center;
  background: radial-gradient(#393939, #000000);

  .page-popup {
    display: grid;
    width: 1024px !important;
    position: relative;
    color: #fff;
    grid-column: 2;
    grid-row: 2;
    align-self: center;
    justify-self: center;
    border-radius: 5px;
    border: 1px solid rgba(255, 255, 255, 0.32);
    background: radial-gradient(rgb(57, 57, 57), rgb(0, 0, 0));
    .page-title {
      max-width: 100%;
      padding: 0.8em 1em 0;
      font-size: 1.875em;
      font-weight: 600;
      text-align: center;
      position: relative;
      .page-close {
        color: rgba(255, 255, 255, 0.6);
        right: 25px;
        font-size: 20px;
        position: absolute;
        &:hover {
          color: rgba(255, 255, 255, 0.8);
        }
      }
    }
    .page-html-container {
      display: flex;
      gap: 10px;
      margin: 1em 1.6em;
      overflow: auto;
      font-size: 1.125em;
      font-weight: 400;
      color: rgb(165, 165, 165) !important;
      background-color: transparent !important;
      .media-container {
        flex: 1;
        .page-video {
          z-index: 0;
          width: 100%;
          height: 240px;
          position: relative;
          object-fit: contain;
          transform-origin: center center;
          transform: rotateY(0deg);
          transition: transform 0.3s ease-in-out;
          &.mirror {
            transform: rotateY(180deg);
          }
        }
      }

      .page-actions {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 15px;
        .buttons {
          display: flex;
          gap: 5px;
          padding: 15px 0;
          :deep(button) {
            width: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 10px;
            font-size: 1.5rem;
            color: white;
            border-radius: 5px;
            background-color: transparent;
            border: 0.5px solid #d9d9d9;
            &:hover {
              background-color: rgb(35, 35, 35);
            }
          }
        }
      }
    }
    .page-input {
      outline: none;
      height: 3.5em;
      padding: 0 0.75em;
      font-size: 1.125em;
      text-align: center;
      margin: 1em 2em 3px;
      border: 0.5px solid #d9d9d9;
      border-radius: 3.375px;
      transition:
        border-color 0.1s,
        box-shadow 0.1s;
      box-shadow:
        inset 0 1px 1px rgba(0, 0, 0, 0.06),
        0 0 0 3px transparent;
      background: inherit;
    }
    .page-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 1.25em 0;
      position: relative;
      .page-confirm {
        color: #fff;
        font-size: 1.2em;
        font-weight: 500;
        border-radius: 0.25em;
        background-color: #7066e0;
        margin: 0.3125em;
        padding: 0.625em 1.1em;
        transition: box-shadow 0.1s;
        box-shadow: 0 0 0 3px transparent;
      }
    }
  }

  @media screen and (max-width: 1024px) {
    .page-popup {
      width: 480px !important;
      .page-html-container {
        flex-direction: column;
      }
    }
  }
}
</style>
