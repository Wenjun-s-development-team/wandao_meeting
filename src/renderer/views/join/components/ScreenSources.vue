<script setup>
import { IPCRequest } from '@/api'

defineOptions({
  name: 'ScreenSources',
})

const screenId = defineModel()
const useScreen = defineModel('useScreen')

const screenSources = ref([])
const showList = ref(false)
const loading = ref(false)

async function onClick() {
  if (useScreen.value) {
    return useScreen.value = false
  }
  showList.value = true
  loading.value = true
  const { sources } = await IPCRequest.system.getSources()
  screenSources.value = sources
  loading.value = false
  if (screenSources.value.length) {
    screenId.value = screenSources.value[0].id
  }
}

function onSubmit() {
  console.log('共享屏幕ID:', screenId.value)
  useScreen.value = true
  showList.value = false
}
</script>

<template>
  <button class="source-button" @click.stop="onClick()">
    <i v-if="useScreen" class="i-fa6-solid-circle-stop" />
    <i v-else class="i-fa6-solid-desktop" />
  </button>
  <el-dialog v-model="showList" title="选择屏幕" append-to-body draggable>
    <el-tabs v-model="screenId" v-loading="loading">
      <template v-for="(source, index) in screenSources" :key="index">
        <el-tab-pane :label="source.name" :name="source.id">
          <img :src="source.thumbnail.toDataURL()">
        </el-tab-pane>
      </template>
    </el-tabs>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="showList = false">取消</el-button>
        <el-button type="primary" @click="onSubmit()">
          确定
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>
