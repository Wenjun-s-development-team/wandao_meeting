<script setup>
import { storeToRefs } from 'pinia'
import { useWebrtcStore } from '@/store'

defineOptions({
  name: 'PeerActions',
})

const webrtcStore = useWebrtcStore()

const {
  showRecord,
} = storeToRefs(webrtcStore)
</script>

<template>
  <SwalDialog v-model="showRecord" role="录音弹窗" width="500" position="top" :show-close="false">
    <div class="swal-recording">
      <img src="../../assets/images/recording.png">
    </div>
    <template #footer>
      <button class="swal-button primary" @click="showRecord = false">关闭</button>
    </template>
  </SwalDialog>
</template>

<style lang="scss" scoped>
.swal-recording {
  display: flex;
  justify-content: center;
}
</style>
