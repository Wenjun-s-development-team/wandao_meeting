<script setup>
import { useRouter } from 'vue-router'
import DeviceSelect from './components/DeviceSelect.vue'
import { useClientMedia } from '@/utils/webrtc'
import { IPCRequest } from '@/api'

const router = useRouter()

const videoRef = ref(null)
const videoInputDeviceId = ref('')
const audioInputDeviceId = ref('')
const audioOutputDeviceId = ref('')

const webrtcStore = useLocalStorage('webrtcStore', {})
const { useMirror, useScreen, useVideo, useAudio } = toRefs(webrtcStore.value)

// 每秒帧数
// const videoFps = reactive([5, 15, 30, 60])

// const { data } = await IPCRequest.system.getSources()

const {
  videoInputs: videoInputDevices,
  audioInputs: audioInputDevices,
  audioOutputs: audioOutputDevices,
} = useDevicesList({
  requestPermissions: true,
  onUpdated() {
    if (!videoInputDevices.value.find(i => i.deviceId === videoInputDeviceId.value)) {
      videoInputDeviceId.value = videoInputDevices.value[0]?.deviceId
    }
    if (!audioInputDevices.value.find(i => i.deviceId === audioInputDeviceId.value)) {
      audioInputDeviceId.value = audioInputDevices.value[0]?.deviceId
    }
    if (!audioOutputDevices.value.find(i => i.deviceId === audioOutputDeviceId.value)) {
      audioOutputDeviceId.value = audioOutputDevices.value[0]?.deviceId
    }
  },
})

const { stream } = useClientMedia({
  useVideo,
  useAudio,
  useScreen,
  videoInputDeviceId,
  audioInputDeviceId,
})

watchEffect(() => {
  if (videoRef.value) {
    videoRef.value.srcObject = stream.value
  }
})

IPCRequest.windows.openDevTools()
</script>

<template>
  <div class="room-page">
    <div class="swal2-popup">
      <h2 class="swal2-title">
        <span>Meeting P2P</span>
        <button class="swal2-close" @click="router.back()"><i class="i-fa6-solid-xmark" /></button>
      </h2>
      <div class="swal2-html-container">
        <div class="swal2-video-container">
          <video
            ref="videoRef"
            class="swal2-video"
            :class="{ mirror: useMirror }"
            autoplay
            playsinline="true"
            poster="../../assets/images/loader.gif"
          />
        </div>
        <div class="swal2-comands">
          <div class="buttons">
            <button @click="useVideo = !useVideo">
              <i v-if="useVideo" class="i-fa6-solid-video" />
              <i v-else class="i-fa6-solid-video-slash color-red" />
            </button>
            <button @click="useAudio = !useAudio">
              <i v-if="useAudio" class="i-fa6-solid-microphone" />
              <i v-else class="i-fa6-solid-microphone-slash color-red" />
            </button>
            <button @click="useScreen = !useScreen">
              <i v-if="!useScreen" class="i-fa6-solid-desktop" />
              <i v-else class="i-fa6-solid-circle-stop" />
            </button>
            <button @click="useMirror = !useMirror">
              <i class="i-fa6-solid-arrow-right-arrow-left" />
            </button>
          </div>
          <div>
            <DeviceSelect
              v-model="videoInputDeviceId"
              :devices="videoInputDevices"
              :disabled="!useVideo"
            />
          </div>
          <div>
            <DeviceSelect
              v-model="audioInputDeviceId"
              :devices="audioInputDevices"
              :disabled="!useAudio"
            />
          </div>
          <div>
            <DeviceSelect
              v-model="audioOutputDeviceId"
              :devices="audioOutputDevices"
              :disabled="!useAudio"
            />
          </div>
        </div>
      </div>
      <input class="swal2-input" maxlength="32" placeholder="请输入您的名称">
      <div class="swal2-actions">
        <button class="swal2-confirm">进 入 会 议</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.room-page {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  align-content: center;
  justify-content: center;
  background: radial-gradient(#393939, #000000);

  .swal2-popup {
    display: grid;
    width: 1024px !important;
    color: #fff;
    grid-column: 2;
    grid-row: 2;
    align-self: center;
    justify-self: center;
    border-radius: 5px;
    border: 1px solid rgba(255, 255, 255, 0.32);
    background: radial-gradient(rgb(57, 57, 57), rgb(0, 0, 0));
    .swal2-title {
      max-width: 100%;
      padding: 0.8em 1em 0;
      font-size: 1.875em;
      font-weight: 600;
      text-align: center;
      position: relative;
      .swal2-close {
        color: rgba(255, 255, 255, 0.6);
        right: 25px;
        font-size: 20px;
        position: absolute;
        &:hover {
          color: rgba(255, 255, 255, 0.8);
        }
      }
    }
    .swal2-html-container {
      display: flex;
      gap: 10px;
      margin: 1em 1.6em;
      overflow: auto;
      font-size: 1.125em;
      font-weight: 400;
      color: rgb(165, 165, 165) !important;
      background-color: transparent !important;
      .swal2-video-container {
        flex: 1;
        .swal2-video {
          z-index: 0;
          width: 100%;
          height: 240px;
          position: relative;
          object-fit: contain;
          transform-origin: center center;
          transition: transform 0.3s ease-in-out;
          &.mirror {
            transform: rotateY(180deg);
          }
        }
      }

      .swal2-comands {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 15px;
        .buttons {
          display: flex;
          gap: 5px;
          padding: 15px 0;
          button {
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
    .swal2-input {
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
    .swal2-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 1.25em 0;
      position: relative;
      .swal2-confirm {
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
    .swal2-popup {
      width: 480px !important;
      .swal2-html-container {
        flex-direction: column;
      }
    }
  }
}
</style>
