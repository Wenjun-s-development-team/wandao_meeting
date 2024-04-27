<script setup>
import { storeToRefs } from 'pinia'
import { useWebrtcStore } from '@/store'

defineOptions({
  name: 'PeerActions',
})

const webrtcStore = useWebrtcStore()

const {
  showRecord,
  showWhiteboard,
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

  <SwalDialog v-model="showWhiteboard" drag role="白板" width="1200">
    <template #header>
      <div class="whiteboard-header">
        <div class="whiteboard-header-title">
          <button class="fas fa-times" />
          <label class="switch">
            <input type="checkbox">
            <span class="slider round" />
          </label>
        </div>
        <div class="whiteboard-header-options">
          <button class="fas fa-circle-half-stroke" />
          <input class="whiteboardColorPicker" type="color" value="#000000">
          <input class="whiteboardColorPicker" type="color" value="#FFFFFF">
          <button><i class="i-fa6-solid-pencil" /></button>
          <button><i class="i-fa6-solidarrow-pointer" /></button>
          <button class="fas fa-undo" />
          <button class="fas fa-redo" />
          <button class="far fa-file-pdf" />
          <button class="far fa-image" />
          <button class="fas fa-link" />
          <button class="fas fa-spell-check" />
          <button class="fas fa-slash" />
          <button class="far fa-square" />
          <button class="fas">
            <svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="#FFFFFF">
              <path d="M12 5.887l8.468 14.113h-16.936l8.468-14.113zm0-3.887l-12 20h24l-12-20z" />
            </svg>
          </button>
          <button class="far fa-circle" />
          <button class="fas fa-save" />
          <button class="fas fa-eraser" />
          <button class="fas fa-trash" />
        </div>
      </div>
    </template>
    <section class="swal-whiteboard">
      <main>
        <canvas />
      </main>
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

#whiteboardLockBtn {
  margin-left: 5px;
  margin-right: 5px;
}

.whiteboard-header-title button,
.whiteboard-header-options button {
  padding: 10px;
  font-size: 1.2rem;
  margin: 1px;
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
  border: 0.5px solid rgb(255 255 255 / 32%);
  border-radius: 5px;
  transition: all 0.3s ease-in-out;
  transition: background 0.23s;
}

.whiteboard-header-title button:hover,
.whiteboard-header-options button:hover {
  color: grey;
  transform: scale(1.1);
  transition: all 0.3s ease-in-out;
}

.whiteboardColorPicker {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  padding: 0;
  width: 20px;
  height: 20px;
  margin: 1px;
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
