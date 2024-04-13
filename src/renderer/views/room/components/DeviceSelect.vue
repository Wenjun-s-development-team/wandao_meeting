<script setup>
import DeviceOption from './DeviceOption.vue'

const model = defineModel()
const props = defineProps(['options', 'disabled'])
</script>

<template>
  <el-select class="select-device" v-model="model" :disabled="disabled">
    <el-option
      v-for="device in options"
      :key="device.deviceId"
      :value="device.deviceId"
      :label="device.label"
    >
      <DeviceOption :device="device" />
    </el-option>
  </el-select>
</template>

<style lang="scss" scoped>
.select-device {
  :deep() {
    .el-select__wrapper {
      height: 40px;
      background-color: #2c2c2c;
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.32) inset;
      .el-select__placeholder:not(.is-transparent) {
        color: #fff;
      }
      &.is-disabled {
        .el-select__placeholder {
          color: rgba(255, 255, 255, 0.6);
        }
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
      }
    }
  }
}
</style>
