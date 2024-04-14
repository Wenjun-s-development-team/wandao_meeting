<script setup>
import { useRouter } from 'vue-router'
import { getRandomNumber } from '@/utils'

const router = useRouter()

const webrtcStore = useLocalStorage('webrtcStore', {
  lastRoomId: '',
  useMirror: false,
  useVideo: true,
  useAudio: true,
})

const { lastRoomId } = toRefs(webrtcStore.value)
const roomId = ref('')

function genRoom() {
  roomId.value = getRandomNumber(6)
}

function joinRoom(value) {
  roomId.value = value || roomId.value
  if (roomId.value) {
    lastRoomId.value = roomId.value
    router.push({ path: '/join', query: { roomId: roomId.value } })
  } else {
    ElMessage.error({
      grouping: true,
      message: '请输入房间号',
    })
  }
}
</script>

<template>
  <section class="start-page">
    <section class="cta-container">
      <section class="cta-summary reveal">
        <h1>
          基于浏览器的免费实时视频通话.<br>
          简单、安全、快速.
        </h1>
        <p>单击即可开始下一次视频通话。不需要下载、插件或登录。直接开始聊天、发信息和共享屏幕。</p>
      </section>
      <section class="cta-room reveal">
        <div class="cta-slogan">
          <h3>
            选择房间名称。<br>
            这个怎么样？
          </h3>
        </div>
        <div class="cta-action">
          <div class="form-group">
            <input v-model="roomId" class="form-input">
            <button class="button" @click="genRoom()">
              <i class="i-fa6-solid-arrows-rotate" />
            </button>
            <button class="button" @click="joinRoom()">进入房间</button>
          </div>
          <div v-if="lastRoomId" class="last">
            <span>您最近的房间: </span>
            <a @click="joinRoom(lastRoomId)">{{ lastRoomId }}</a>
          </div>
        </div>
      </section>
    </section>
  </section>
</template>

<style lang="scss" scoped>
.start-page {
  color: #fff;
  width: 100%;
  height: 100%;
  background-image: url(../../assets/images/start-bg.svg);
  background-repeat: no-repeat;
  background-size: cover;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;

  .cta-container {
    width: 60%;
    min-width: 500px;
    .cta-summary {
      width: 485px;
      h1 {
        font-size: 44px;
        line-height: 54px;
      }
      p {
        color: #959cb1;
        font-size: 20px;
        margin-top: 20px;
      }
    }

    .cta-room {
      margin-top: 60px;
      padding: 64px 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-radius: 15px;
      background: linear-gradient(100deg, #376df9 0, #ff5fa0 75%, #ffc55a 100%);
      .cta-slogan h3 {
        font-size: 32px;
      }
      .cta-action {
        .form-group {
          display: flex;
          gap: 12px;
          .form-input {
            min-width: 280px;
            border-radius: 6px;
            font-size: 16px;
            line-height: 24px;
            padding: 10px 15px;
            height: 48px;
            color: #16171b;
            outline: none;
          }
          .button {
            color: #fff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            border-radius: 6px;
            padding: 12px 31px;
            height: 48px;
            background-color: #000;
            border: 0;
            margin: 0;
            &:hover {
              background-color: #4678f9;
            }
          }
        }
        .last {
          font-size: 16px;
          margin-top: 15px;
        }
      }
      transform: translateY(10px);
    }

    .reveal {
      opacity: 0;
      transition: opacity 1s ease-in-out;
      animation: moveAndFadeIn 1s ease-in-out forwards;
    }
  }
}

@keyframes moveAndFadeIn {
  0% {
    transform: translateY(0);
    opacity: 0;
  }
  100% {
    transform: translateY(-45px);
    opacity: 1;
  }
}
</style>
