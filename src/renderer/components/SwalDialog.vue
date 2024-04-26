<script setup>
import { size } from 'lodash'
import { addUnit } from '@/utils'

const props = defineProps({
  title: String,
  show: Boolean,
  width: {
    type: [Number, String],
    default: 'auto',
  },
  animate: {
    type: String,
    default: 'fadeInDown',
  },
})

const show = defineModel()

const swalClass = computed(() => {
  return [{
    animate: true,
  }, props.animate]
})

const swalStyle = computed(() => {
  const styles = {}
  if (props.width) {
    styles.width = addUnit(props.width)
  }
  return styles
})
</script>

<template>
  <div v-if="show" class="swal-container">
    <section class="swal-dialog" :class="swalClass" :style="swalStyle">
      <header class="swal-header">
        <span>{{ title }}</span>
        <button class="close" @click="router.back()"><i class="i-fa6-solid-xmark" /></button>
      </header>
      <main class="swal-body">
        <slot />
      </main>
      <footer class="swal-footer">
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
  display: grid;
  position: fixed;
  grid-template-areas:
    'top-start top top-end'
    'center-start center center-end'
    'bottom-start bottom-center bottom-end';
  grid-template-rows:
    minmax(min-content, auto)
    minmax(min-content, auto)
    minmax(min-content, auto);
  height: 100%;
  padding: 0.625em;
  overflow-x: hidden;
  transition: background-color 0.1s;
  background: rgba(0, 0, 0, 0.4);
  grid-template-columns: auto minmax(0, 1fr) auto;

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
    .swal-body {
      display: grid;
    }
    &.animate {
      animation-duration: 1s;
      animation-fill-mode: both;
      &.fadeInDown {
        animation-name: fadeInDown;
      }
    }
  }

  .swal-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 1.25em 0;
    position: relative;

    .swal-styled {
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
      &.swal-confirm {
        background-color: #7066e0;
      }
    }
    .page-confirm {
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
