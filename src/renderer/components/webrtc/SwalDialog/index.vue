<script setup>
import { useDraggable } from './useDraggable'
import { addUnit, playSound } from '@/utils'

defineOptions({
  name: 'SwalDialog',
})

const props = defineProps({
  title: String,
  drag: {
    type: Boolean,
    default: false,
  },
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
const dragRef = ref()

useDraggable(swalRef, dragRef, props.drag, false, 32)

watch(showModel, () => {
  if (showModel.value) {
    playSound('newMessage')
    showDialog.value = true
    // 打开时 监听动画是否结束
    nextTick(() => {
      const cleanup = useEventListener(swalRef.value, 'animationend', () => {
        if (!showModel.value) {
          cleanup() // 清除监听
          showDialog.value = false // 动画结束后才关闭 dialog
        }
        emit(showModel.value ? 'opened' : 'closed')
      })
    })
  }
}, { immediate: true })

const swalClass = computed(() => {
  return [{ drag: props.drag }, props.position]
})

const swalStyle = computed(() => {
  const styles = {}

  if (props.width) {
    styles.width = addUnit(props.width)
  }

  // 切换动画名称 触发动画 yarn add animate.css
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
      <header ref="dragRef" class="swal-header">
        <div class="swal-header--wrap">
          <slot v-if="$slots.header" name="header" />
          <div v-else-if="title" class="title">{{ title }}</div>
        </div>
        <button v-if="showClose" class="close" @click="onClosed()">
          <i class="i-fa6-solid-xmark" />
        </button>
      </header>
      <main class="swal-body">
        <slot />
      </main>
      <footer v-if="$slots.footer" class="swal-footer">
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
    display: flex;
    align-items: center;
    max-width: 100%;
    padding: 0 15px;
    font-size: 1.875em;
    font-weight: 600;
    position: relative;
    &--wrap {
      flex: 1;
    }
    .title {
      padding: 10px;
    }
    .close {
      margin-left: 10px;
      font-size: 20px;
      color: rgba(255, 255, 255, 0.6);
      &:hover {
        color: rgba(255, 255, 255, 0.8);
      }
    }
  }

  .swal-dialog {
    color: #fff;
    max-width: 100%;
    position: relative;
    box-sizing: border-box;
    border-radius: 5px;
    border: 0.5px solid rgba(255, 255, 255, 0.32);
    background: radial-gradient(rgb(57, 57, 57), rgb(0, 0, 0));

    animation-duration: 0.5s;
    // animation-fill-mode: both;
    animation-direction: normal;

    &.top {
      align-self: start;
    }

    &.drag {
      .swal-header {
        cursor: move;
      }
    }
  }

  .swal-body {
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
