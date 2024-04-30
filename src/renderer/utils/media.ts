import { fabric } from 'fabric'
import * as pdfjsLib from 'pdfjs-dist'
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs'

(window as any).pdfjsWorker = pdfjsWorker

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

export function readBlob(blob: Blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(reader.result))
    reader.addEventListener('error', reject)
    reader.readAsDataURL(blob)
  })
}

export async function loadPDF(pdfData: any, pages?: number[]) {
  const Base64Prefix = 'data:application/pdf;base64,'
  pdfData = pdfData instanceof Blob ? await readBlob(pdfData) : pdfData
  const data = atob(pdfData.startsWith(Base64Prefix) ? pdfData.substring(Base64Prefix.length) : pdfData)
  try {
    const pdf = await pdfjsLib.getDocument({ data }).promise
    const numPages = pdf.numPages
    const canvases = await Promise.all(
      Array.from({ length: numPages }, (_, i) => {
        const pageNumber = i + 1
        if (pages && !pages.includes(pageNumber)) {
          return null
        }
        return pdf.getPage(pageNumber).then(async (page) => {
          const viewport = page.getViewport({ scale: window.devicePixelRatio })
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          canvas.height = viewport.height
          canvas.width = viewport.width
          const renderContext = {
            canvasContext: context!,
            viewport,
          }
          await page.render(renderContext).promise
          return canvas
        })
      }),
    )
    return canvases.filter(canvas => canvas !== null)
  } catch (error) {
    console.error('Error loading PDF:', error)
    throw error
  }
}

export async function pdfToImage(pdfData: any, canvas: fabric.Canvas) {
  const scale = 1 / window.devicePixelRatio
  try {
    const canvases = await loadPDF(pdfData)
    canvases.forEach(async (c) => {
      canvas.add(
        new fabric.Image(await c!, { scaleX: scale, scaleY: scale }),
      )
    })
  } catch (error) {
    console.error('Error converting PDF to images:', error)
    throw error
  }
}
