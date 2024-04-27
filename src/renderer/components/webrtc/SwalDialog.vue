<script setup>
import { addUnit } from '@/utils'

defineOptions({
  name: 'SwalDialog',
})

const props = defineProps({
  title: String,
  width: {
    type: [Number, String],
    default: 'auto',
  },
  position: {
    type: String,
    // 位置 top | center | left
    default: 'center',
  },
  showClose: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['opened', 'closed'])

const showModel = defineModel()
const showDialog = ref(false)
const swalRef = ref()

watch(showModel, () => {
  if (showModel.value) {
    showDialog.value = true
    // 打开时监听动画是否结束
    nextTick(() => {
      const cleanup = useEventListener(swalRef.value, 'animationend', () => {
        if (showModel.value) {
          emit('opened')
        } else {
          cleanup()
          emit('closed')
          // 动画结束后才关闭 dialog
          showDialog.value = false
        }
      })
    })
  }
}, { immediate: true })

const swalClass = computed(() => {
  return [props.position]
})

const swalStyle = computed(() => {
  const styles = {}
  if (props.width) {
    styles.width = addUnit(props.width)
  }

  // 切换动画名称
  if (['top', 'center'].includes(props.position)) {
    styles.animationName = showModel.value ? 'fadeInDown' : 'fadeOutUp'
  }

  return styles
})

function onClosed() {
  showModel.value = false
}
</script>

<template>
  <div v-if="showDialog" class="swal-container">
    <section ref="swalRef" class="swal-dialog" :class="swalClass" :style="swalStyle">
      <header class="swal-header">
        <span>{{ title }}</span>
        <button v-if="showClose" class="close" @click="onClosed()">
          <i class="i-fa6-solid-xmark" />
        </button>
      </header>
      <main class="swal-body">
        <slot />
      </main>
      <footer :class="{ 'swal-footer': $slots.footer }">
        <slot name="footer" />
      </footer>
    </section>
  </div>
</template>

<style lang="scss">
.swal-container {
  inset: 0;
  top: 32px;
  z-index: 1060;
  display: flex;
  align-items: center;
  justify-content: center;
  position: fixed;
  padding: 10px;
  height: 100%;
  padding: 0.625em;
  overflow-x: hidden;
  background: rgba(0, 0, 0, 0.4);
  transition: background-color 0.1s;
  .swal-header {
    max-width: 100%;
    padding: 0.8em 1em 0;
    font-size: 1.875em;
    font-weight: 600;
    text-align: center;
    position: relative;
    .close {
      color: rgba(255, 255, 255, 0.6);
      right: 25px;
      font-size: 20px;
      position: absolute;
      &:hover {
        color: rgba(255, 255, 255, 0.8);
      }
    }
  }

  .swal-dialog {
    color: #fff;
    display: grid;
    grid-row: 2;
    grid-column: 2;
    max-width: 100%;
    align-self: center;
    justify-self: center;
    position: relative;
    box-sizing: border-box;
    border-radius: 5px;
    border: 0.5px solid rgba(255, 255, 255, 0.32);
    grid-template-columns: minmax(0, 100%);
    background: radial-gradient(rgb(57, 57, 57), rgb(0, 0, 0));

    animation-duration: 0.5s;
    animation-fill-mode: both;
    animation-direction: normal;

    &.top {
      align-self: start;
    }
  }

  .swal-body {
    display: grid;
    padding: 10px;
  }

  .swal-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px;
    position: relative;
  }

  .swal-button {
    color: #fff;
    font-size: 1.2em;
    font-weight: 500;
    border-radius: 0.25em;
    margin: 0.3125em;
    padding: 0.625em 1.1em;
    transition: box-shadow 0.1s;
    box-shadow: 0 0 0 3px transparent;
    &:not([disabled]) {
      cursor: pointer;
    }
    &.primary {
      background-color: #7066e0;
    }
  }

  .swal-file,
  .swal-input,
  .swal2-textarea {
    width: auto;
    box-sizing: border-box;
  }
  .swal-input {
    width: auto;
    display: flex;
    outline: none;
    height: 3.5em;
    padding: 0 0.75em;
    font-size: 1.125em;
    text-align: center;
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
}
</style>
