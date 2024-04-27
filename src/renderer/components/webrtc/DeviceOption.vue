<script setup>
defineOptions({
  name: 'DeviceOption',
})

const props = defineProps(['device'])
const { device } = toRefs(props)
</script>

<template>
  <span>
    <template v-if="'videoinput' === device.kind"> 📹 {{ device.label || 'camera' }} </template>
    <template v-else-if="'audioinput' === device.kind">
      🎤 {{ device.label || 'microphone' }}
    </template>
    <template v-else-if="'audiooutput' === device.kind">
      🔈 {{ device.label || 'speaker' }}
    </template>
  </span>
</template>
