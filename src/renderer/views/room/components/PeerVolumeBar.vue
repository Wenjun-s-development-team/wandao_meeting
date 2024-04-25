<script setup>
const props = defineProps(['peer'])
const { peer } = toRefs(props)

const pitchRef = ref()

function useVolume() {
  const styles = ref({})
  watchEffect(() => {
    const volume = peer?.value.volume || 0
    styles.value = {
      height: `${volume}%`,
      backgroundColor: volume > 50 ? 'orange' : '#19bb5c',
    }

    setTimeout(() => {
      styles.value.backgroundColor = '#19bb5c'
      styles.value.height = '0%'
    }, 100)
  })

  return { styles }
}

const { styles } = useVolume()
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
