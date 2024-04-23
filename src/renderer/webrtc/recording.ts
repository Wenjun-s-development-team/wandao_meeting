export class RecordingServer {
  declare mediaRecorder: MediaRecorder
  // declare audioRecorder: MixedAudioRecorder

  /**
   * Stop recording
   */
  stopStreamRecording() {
    this.mediaRecorder.stop()
    // this.audioRecorder.stopMixedAudioStream()
  }
}
