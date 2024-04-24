<template>
  <div class="speech-bar">
    <div id="" class="pitch" />
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
    transition-property: height background-color;
    transition-duration: 0.25s;
  }
}
</style>
