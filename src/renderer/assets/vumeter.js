const SMOOTHING_FACTOR = 0.8
registerProcessor(
  'vumeter',
  class extends AudioWorkletProcessor {
    _volume
    _updateIntervalInMS
    _nextUpdateFrame
    _currentTime

    constructor() {
      super()
      this._volume = 0
      this._updateIntervalInMS = 25
      this._nextUpdateFrame = this._updateIntervalInMS
      this._currentTime = 0
      this.port.onmessage = (event) => {
        if (event.data.updateIntervalInMS) {
          this._updateIntervalInMS = event.data.updateIntervalInMS
        }
      }
    }

    get intervalInFrames() {
      return (this._updateIntervalInMS / 1000) * sampleRate
    }

    process(inputs) {
      const input = inputs[0]
      if (input.length > 0) {
        const samples = input[0]
        let sum = 0
        let rms = 0
        for (let i = 0; i < samples.length; i += 1) {
          sum += samples[i] * samples[i]
        }
        rms = Math.sqrt(sum / samples.length)
        this._volume = Math.max(rms, this._volume * SMOOTHING_FACTOR)
        this._nextUpdateFrame -= samples.length
        if (this._nextUpdateFrame < 0) {
          this._nextUpdateFrame += this.intervalInFrames
          if (!this._currentTime || currentTime - this._currentTime > 0.125) {
            this._currentTime = currentTime
            this.port.postMessage({ volume: this._volume })
          }
        }
      }

      return true
    }
  },
)
