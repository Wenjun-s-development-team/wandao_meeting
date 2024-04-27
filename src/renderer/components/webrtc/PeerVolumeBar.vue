<script setup>
defineOptions({
  name: 'PeerVolumeBar',
})

const props = defineProps(['peer'])
const { peer } = toRefs(props)

const pitchRef = ref()

// 监听音量
function useFinalVolume() {
  const styles = ref({})
  watchEffect(() => {
    const finalVolume = peer?.value.finalVolume || 0
    styles.value = {
      height: `${finalVolume}%`,
      backgroundColor: finalVolume > 50 ? 'orange' : '#19bb5c',
    }

    setTimeout(() => {
      styles.value.backgroundColor = '#19bb5c'
      styles.value.height = '0%'
    }, 100)
  })

  return { styles }
}

const { styles } = useFinalVolume()
</script>

<template>
  <div class="speech-bar">
    <div ref="pitchRef" class="pitch" :style="styles" />
  </div>
</template>

<style lang="scss" scoped>
.speech-bar {
  z-index: 9;
  top: 0;
  bottom: 0;
  right: 2px;
  width: 10px;
  display: flex;
  position: absolute;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  pointer-events: none;
  .pitch {
    width: 6px;
    border-radius: 6px;
    background: rgba(#19bb5c, 0.65);
    transition: height background-color 0.25s;
  }
}
</style>
