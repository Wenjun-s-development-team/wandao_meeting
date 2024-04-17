// processor.js
const SMOOTHING_FACTOR = 0.8

class VolumeMeter extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return []
  }

  constructor() {
    super()
    this.volume = 0
    this.lastUpdate = currentTime
  }

  process(inputs) {
    const inputData = inputs[0][0]
    let sum = 0

    // 计算平方和
    for (let i = 0; i < inputData.length; ++i) {
      sum += inputData[i] * inputData[i]
    }

    // 计算RMS水平并更新音量
    const rms = Math.sqrt(sum / inputData.length)

    this.volume = Math.max(rms, this.volume * SMOOTHING_FACTOR)

    // 每200毫秒向节点发布一条消息
    if (currentTime - this.lastUpdate > 0.2) {
      this.port.postMessage({ eventType: 'volume', volume: this.volume * 100 })
      // Store previous time
      this.lastUpdate = currentTime
    }
    return true
  }
}

registerProcessor('vumeter', VolumeMeter) // 注册一个名为 vumeter 的处理函数 注意：与主线程中的名字对应。
