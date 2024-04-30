<script setup>
import { storeToRefs } from 'pinia'
import { WhiteboardServer } from '@/webrtc'
import { playSound, setProperty } from '@/utils'

defineOptions({
  name: 'PeerWhiteboard',
})

const showModel = defineModel()
const client = inject('client')

const wb = reactive({
  switch: false,
  transparent: false,
})

function onOpened() {
  client.whiteboardServer.setupWhiteboard('wbCanvas', 1200, 600)
}

function toggleTransparent() {
  wb.transparent = !wb.transparent
  if (wb.transparent) {
    setProperty('--swal-background', 'rgba(0, 0, 0, 0.1)')
  } else {
    setProperty('--swal-background', 'radial-gradient(rgb(57, 57, 57), rgb(0, 0, 0))')
  }
}

function confirmCleanBoard() {
  ElMessageBox.confirm('确定要清空白板吗?', '警告', {
    type: 'warning',
    center: true,
    draggable: true,
  }).then(() => {
    client.whiteboardServer.whiteboardAction(client.whiteboardServer.getWhiteboardAction('clear'))
    playSound('delete')
  }).catch(() => {})
}
</script>

<template>
  <slot />
  <SwalDialog v-model="showModel" drag role="白板" width="1200" height="600" @opened="onOpened()">
    <template #header>
      <div class="whiteboard-header">
        <div class="whiteboard-header-title">
          <el-switch
            v-model="wb.switch"
            style="--el-switch-on-color: green;"
          />
        </div>
        <div class="whiteboard-header-options">
          <button @click="toggleTransparent()"><i class="i-fa6-solid-circle-half-stroke" /></button>
          <span class="button">
            <input class="whiteboardColorPicker" type="color" value="#000000">
          </span>
          <span class="button">
            <input class="whiteboardColorPicker" type="color" value="#FFFFFF">
          </span>
          <button @click="client.whiteboardServer.changeAction('draw')"><i class="i-fa6-solid-pencil" /></button>
          <button><i class="i-fa6-solid-arrow-pointer" /></button>
          <button @click="client.whiteboardServer.canvasUndo()"><i class="i-fa6-solid-arrow-rotate-left" /></button>
          <button @click="client.whiteboardServer.canvasRedo()"><i class="i-fa6-solid-arrow-rotate-right" /></button>
          <button>
            <i class="i-fa6-solid-file-pdf" />
            <label class="select-file">
              <input type="file" @change="client.whiteboardServer.addObject('pdfFile', $event)">
            </label>
          </button>
          <button>
            <i class="i-fa6-solid-image" />
            <label class="select-file">
              <input type="file" @change="client.whiteboardServer.addObject('imgFile', $event)">
            </label>
          </button>
          <button @click="client.whiteboardServer.addObject('imgUrl')"><i class="i-fa6-solid-link" /></button>
          <button @click="client.whiteboardServer.addObject('text')"><i class="i-fa6-solid-spell-check" /></button>
          <button @click="client.whiteboardServer.addObject('line')"><i class="i-fa6-solid-slash" /></button>
          <button @click="client.whiteboardServer.addObject('rect')"><i class="i-fa6-regular-square" /></button>
          <button @click="client.whiteboardServer.addObject('triangle')"><i class="i-svg-triangle" /></button>
          <button @click="client.whiteboardServer.addObject('circle')"><i class="i-fa6-regular-circle" /></button>
          <button><i class="i-fa6-regular-floppy-disk" /></button>
          <button @click="client.whiteboardServer.changeAction('erase')"><i class="i-fa6-solid-eraser" /></button>
          <button @click="confirmCleanBoard()"><i class="i-fa6-solid-trash" /></button>
        </div>
      </div>
    </template>
    <section class="swal-whiteboard">
      <canvas id="wbCanvas" />
    </section>
  </SwalDialog>
</template>

<style lang="scss" scoped>
.swal-recording {
  display: flex;
  justify-content: center;
}

.swal-whiteboard {
  width: 1200;
  height: 600;
  overflow: hidden;
}

.whiteboard-header {
  display: flex;
  justify-content: space-between;
  padding: 5px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.2);
  color: #ffffff;
  cursor: move;
}

.whiteboard-header-title {
  display: flex;
  align-items: center;
}

.whiteboard-header-options {
  gap: 3px;
  display: flex;
  align-items: center;
  button {
    position: relative;
    .select-file {
      inset: 0;
      position: absolute;
      input {
        display: none;
      }
    }
  }
}

.whiteboard-header-title button,
.whiteboard-header-options button,
.whiteboard-header-options .button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 35.4px;
  height: 35.4px;
  font-size: 1.2rem;
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
  border: 0.5px solid rgb(255 255 255 / 32%);
  border-radius: 5px;
  transition: all 0.3s ease-in-out;
}

.whiteboard-header-title button:hover,
.whiteboard-header-options button:hover {
  color: grey;
  transform: scale(1.1);
  transition: all 0.3s ease-in-out;
}

.whiteboardColorPicker {
  padding: 0;
  width: 16px;
  height: 16px;
  margin: 1px;
  appearance: none;
  border-radius: 50px;
  border: solid 0.5px #afadad38;
  cursor: pointer;
}
.whiteboardColorPicker:hover {
  transform: scale(1.1);
  transition: all 0.3s ease-in-out;
}
.whiteboardColorPicker::-webkit-color-swatch {
  border: none;
  border-radius: 20px;
  padding: 0;
}
.whiteboardColorPicker::-webkit-color-swatch-wrapper {
  border: none;
  border-radius: 20px;
  padding: 0;
}
.whiteboardColorPicker::-moz-color-swatch {
  border: none;
  border-radius: 20px;
  padding: 0;
}
.whiteboardColorPicker::-moz-color-swatch-wrapper {
  border: none;
  border-radius: 20px;
  padding: 0;
}
.whiteboardColorPicker::color-swatch {
  border: none;
  border-radius: 20px;
  padding: 0;
}
.whiteboardColorPicker::color-swatch-wrapper {
  border: none;
  border-radius: 20px;
  padding: 0;
}
</style>
