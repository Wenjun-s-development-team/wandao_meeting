<script setup>
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import ScreenSources from '../components/ScreenSources.vue'
import DeviceSelect from './components/DeviceSelect.vue'
import { useMediaServer } from '@/webrtc/media'
import { IPCRequest, RTCRequest } from '@/api'

import { useWebrtcStore } from '@/store'
import SwalDialog from '@/components/SwalDialog.vue'

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

const show = ref(true)
const isMounted = useMounted()
const mediaServer = useMediaServer()
watchOnce(isMounted, async () => {
  if (videoElement.value && audioElement.value) {
    await mediaServer.init(videoElement.value, audioElement.value).start()
  }
})

async function userLogin(name) {
  await webrtcStore.userLogin({ name, passwd: '123456' })
  router.push({ path: '/room', query: { roomId: query.roomId } })
}

function switchScreenSharing() {
  mediaServer.switchScreenSharing(true)
}

IPCRequest.windows.openDevTools()
</script>

<template>
  <div class="join-page">
    <SwalDialog v-model="show" width="1024" title="Meeting P2P">
      <div class="media-container">
        <div class="media-video">
          <video
            ref="videoElement"
            class="video"
            :class="{ mirror: local.mirrorStatus }"
            autoplay
            playsinline="true"
            poster="../../assets/images/loader.gif"
          />
          <audio ref="audioElement" autoplay muted />
        </div>
        <div class="media-actions">
          <div class="buttons">
            <button @click="local.videoStatus = !local.videoStatus">
              <i v-if="local.videoStatus" class="i-fa6-solid-video" />
              <i v-else class="i-fa6-solid-video-slash color-red" />
            </button>
            <button @click="local.audioStatus = !local.audioStatus">
              <i v-if="local.audioStatus" class="i-fa6-solid-microphone" />
              <i v-else class="i-fa6-solid-microphone-slash color-red" />
            </button>
            <ScreenSources :peer="local" @change="switchScreenSharing()">
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
      <input class="swal-input" disabled maxlength="32" placeholder="请输入您的名称">
      <template #footer>
        <div class="media-footer">
          <button class="swal-confirm swal-styled" @click="userLogin('admin')">进 入 会 议(admin)</button>
          <button class="swal-confirm swal-styled" @click="userLogin('elkon')">进 入 会 议(elkon)</button>
        </div>
      </template>
    </SwalDialog>
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

  .swal-input {
    margin: 1em 2em 3px;
  }

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

  .media-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 1.25em 0;
    position: relative;
  }

  @media screen and (max-width: 1024px) {
    .media-container {
      width: 480px !important;
      flex-direction: column;
    }
  }
}
</style>
