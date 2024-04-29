<script setup>
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useMediaServer } from '@/webrtc'
import { IPCRequest, RTCRequest } from '@/api'

import { useWebrtcStore } from '@/store'

const webrtcStore = useWebrtcStore()

const router = useRouter()
const query = useUrlSearchParams('hash')

const localVideoElement = ref(null)
const localAudioElement = ref(null)

const {
  local,
  videoInputDeviceId,
  audioInputDeviceId,
  audioOutputDeviceId,
  videoInputDevices,
  audioInputDevices,
  audioOutputDevices,
} = storeToRefs(webrtcStore)

const show = ref(true)
const isMounted = useMounted()
const mediaServer = useMediaServer()
watchOnce(isMounted, async () => {
  if (localVideoElement.value && localAudioElement.value) {
    mediaServer.init(localVideoElement.value, localAudioElement.value)
    mediaServer.start()
  }
})

async function userLogin(name) {
  await webrtcStore.userLogin({ name, passwd: '123456' })
  router.push({ path: '/room', query: { roomId: query.roomId } })
}

IPCRequest.windows.openDevTools()
</script>

<template>
  <div class="join-page">
    <SwalDialog v-model="show" width="1024" title="Meeting P2P" @closed="router.back()">
      <div class="media-container">
        <div class="media-video">
          <video
            ref="localVideoElement"
            class="video"
            :class="{ mirror: local.mirrorStatus }"
            autoplay
            playsinline="true"
            poster="../../assets/images/loader.gif"
          />
          <audio ref="localAudioElement" autoplay muted />
        </div>
        <div class="media-actions">
          <div class="buttons">
            <button @click="mediaServer.handleVideo()">
              <i v-if="local.videoStatus" class="i-fa6-solid-video" />
              <i v-else class="i-fa6-solid-video-slash color-red" />
            </button>
            <button @click="mediaServer.handleAudio()">
              <i v-if="local.audioStatus" class="i-fa6-solid-microphone" />
              <i v-else class="i-fa6-solid-microphone-slash color-red" />
            </button>
            <ScreenSources :peer="local" @change="mediaServer.switchScreenSharing(true)">
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
      <div class="px-1.6em">
        <input class="swal-input" disabled maxlength="32" placeholder="请输入您的名称">
      </div>
      <template #footer>
        <button class="swal-button primary" @click="userLogin('admin')">进 入 会 议(admin)</button>
        <button class="swal-button primary" @click="userLogin('elkon')">进 入 会 议(elkon)</button>
      </template>
    </SwalDialog>
  </div>
</template>

<style lang="scss" scoped>
.join-page {
  width: 100%;
  height: 100%;
  background: radial-gradient(#393939, #000000);

  .media-container {
    display: flex;
    gap: 10px;
    margin: 1em 1.6em;
    overflow: auto;
    font-size: 1.125em;
    font-weight: 400;
    color: rgb(165, 165, 165) !important;
    background-color: transparent !important;
    .media-video {
      flex: 1;
      .video {
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

    .media-actions {
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

  @media screen and (max-width: 1024px) {
    .media-container {
      width: 480px !important;
      flex-direction: column;
    }
  }
}
</style>
