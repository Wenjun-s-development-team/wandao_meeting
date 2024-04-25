<script setup>
import { useWebrtcStore } from '@/store'

const webrtcStore = useWebrtcStore()

const outputRef = ref()

onMounted(() => {
  const sinkId = webrtcStore.audioOutputDeviceId
  if (typeof outputRef.value.sinkId !== 'undefined') {
    outputRef.value.setSinkId(sinkId).then(() => {
      console.log(`成功，已连接音频输出设备: ${sinkId}`)
    }).catch((err) => {
      let errorMessage = err
      if (err.name === 'SecurityError') {
        errorMessage = 'SecurityError: 您需要使用HTTPS来选择音频输出设备'
      } else if (err.name === 'NotAllowedError') {
        errorMessage = 'NotAllowedError: 未授予使用音频输出设备的权限'
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'NotFoundError: 找不到指定的音频输出设备'
      } else {
        errorMessage = `Error: ${err}`
      }
      console.error(errorMessage)
    })
  } else {
    console.warn('浏览器不支持输出设备选择.')
  }
})
</script>

<template>
  <audio ref="outputRef" autoplay muted />
</template>
