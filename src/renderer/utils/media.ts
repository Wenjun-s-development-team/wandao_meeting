export async function playSound(name: string) {
  const sound = `../assets/sounds/${name}.mp3`
  const audio = new Audio(sound)
  try {
    audio.volume = 0.5
    await audio.play()
  } catch (err) {
    console.error('Cannot play sound', err)
  }
}
