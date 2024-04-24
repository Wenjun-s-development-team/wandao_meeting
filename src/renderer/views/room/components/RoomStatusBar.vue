<template>
  <div class="room-statusbar">
    <button class="unhover">39m 20s</button>
    <button><i class="i-fa6-solid-map-pin" /></button>
    <button><i class="i-fa6-solid-arrow-right-arrow-left" /></button>
    <button><i class="i-fa6-solid-images" /></button>
    <button><i class="i-fa6-solid-expand" /></button>
    <button><i class="i-fa6-solid-camera-retro" /></button>
    <button><i class="i-fa6-solid-circle" /></button>
    <button><i class="i-fa6-solid-video" /></button>
    <button><i class="i-fa6-solid-microphone" /></button>
  </div>
</template>

<style lang="scss" scoped>
.room-statusbar {
  gap: 5px;
  z-index: 8;
  top: 0;
  left: 0;
  right: 0;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 15px;
  position: absolute;
  border-radius: 10px 10px 0 0;
  background: rgba(0, 0, 0, 0.2);
  button {
    display: inline;
    padding: 5px;
    font-size: small;
    text-decoration: none;
    border-radius: 3px;
    background: transparent;
    color: #fff;
    &:not(.unhover) {
      width: 26px;
      height: 26px;
      &:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    }
  }
}
</style>
