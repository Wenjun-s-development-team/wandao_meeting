<script setup>
import { IPCRequest } from '@/api'

function minimize() {
  IPCRequest.windows.minimize()
}

function maximize() {
  IPCRequest.windows.maximize()
}

function closeWindow() {
  IPCRequest.windows.close()
}
</script>

<template>
  <div class="layout">
    <header class="layout-header">
      <div class="inner"></div>
      <button role="最小化" @click.stop="minimize()">
        <figure class="i-svg-minimize" />
      </button>
      <button role="最大化" @click.stop="maximize()">
        <figure class="i-svg-maxmize" />
      </button>
      <button role="关闭" class="close" @click.stop="closeWindow()">
        <i class="i-svg-close" />
      </button>
    </header>
    <main class="layout-main">
      <router-view />
    </main>
    <footer class="layout-footer" />
  </div>
</template>

<style lang="scss" scoped>
.layout {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

  &-header {
    color: #aaa;
    display: flex;
    align-items: center;
    min-height: 32px;
    padding-left: 15px;
    font-size: 14px;
    line-height: 14px;
    background: #fff;
    -webkit-app-region: drag;
    border-bottom: 1px solid #ccc;
    .inner {
      flex: 1;
    }
    > button {
      width: 34px;
      height: 32px;
      -webkit-app-region: no-drag;

      &:hover {
        background: #eee;
      }

      i {
        font-size: 12px;
      }
    }
  }

  &-main {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  &-footer {
    padding: 0;
  }
}
</style>
