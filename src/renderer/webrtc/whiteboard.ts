import { storeToRefs } from 'pinia'
import { fabric } from 'fabric'
import type { Client } from './client'
import { pdfToImage, playSound, setProperty } from '@/utils'
import { useWebrtcStore } from '@/store'
import './eraserBrush'

const webrtcStore = useWebrtcStore()
const {
  local,
} = storeToRefs(webrtcStore)

/**
 * 白板
 */
export class WhiteboardServer {
  client: Client
  canvas: fabric.Canvas = new fabric.Canvas('canvas')

  wbPop: fabric.Object[] = []
  isOpened: boolean = false
  isLocked: boolean = false
  isRedoing: boolean = false
  wbIsDrawing: boolean = false
  wbIsEraser: boolean = false
  wbIsRedoing: boolean = false

  brush: { color: string, width: number } = {
    color: '#fff',
    width: 3,
  }

  constructor(client: Client) {
    this.client = client
  }

  /**
   * 如果白板打开，则将画布更新到所有P2P连接中
   */
  async onUpdate() {
    if (this.isOpened && this.client.peerCount > 0) {
      this.canvasToJson()
      this.whiteboardAction(this.getWhiteboardAction(this.isLocked ? 'lock' : 'unlock'))
    }
  }

  changeAction(action: string) {
    switch (action) {
      case 'select':
        this.canvas.isDrawingMode = false
        break
      case 'erase':
        // eslint-disable-next-line ts/ban-ts-comment
        // @ts-expect-error
        this.canvas.freeDrawingBrush = new fabric.EraserBrush(this.canvas)
        this.canvas.freeDrawingBrush.width = 3
        this.canvas.isDrawingMode = true
        break
      case 'undo':
        // eslint-disable-next-line ts/ban-ts-comment
        // @ts-expect-error
        this.canvas.freeDrawingBrush = new fabric.EraserBrush(this.canvas)
        this.canvas.freeDrawingBrush.width = 3
        // eslint-disable-next-line ts/ban-ts-comment
        // @ts-expect-error
        this.canvas.freeDrawingBrush.inverted = true
        this.canvas.isDrawingMode = true
        break
      case 'draw':
        this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas)
        this.canvas.freeDrawingBrush.width = 3
        this.canvas.isDrawingMode = true
        break
      default:
        break
    }
  }

  setupWhiteboard(element: string, width: number = 1200, height: number = 600) {
    this.setupWhiteboardCanvas(element)
    this.setupWhiteboardCanvasSize(width, height)
    // this.setupWhiteboardLocalListners()
  }

  setupWhiteboardCanvas(element: string) {
    this.canvas = new fabric.Canvas(element)
    this.canvas.freeDrawingBrush.color = '#FFFFFF'
    this.canvas.freeDrawingBrush.width = 3
    this.whiteboardIsDrawingMode(true)
  }

  setupWhiteboardCanvasSize(width: number, height: number) {
    const scaleFactorX = window.innerWidth / width
    const scaleFactorY = window.innerHeight / height
    if (scaleFactorX < scaleFactorY && scaleFactorX < 1) {
      this.canvas.setWidth(width * scaleFactorX)
      this.canvas.setHeight(height * scaleFactorX)
      this.canvas.setZoom(scaleFactorX)
      this.setWhiteboardSize(width * scaleFactorX, height * scaleFactorX)
    } else if (scaleFactorX > scaleFactorY && scaleFactorY < 1) {
      this.canvas.setWidth(width * scaleFactorY)
      this.canvas.setHeight(height * scaleFactorY)
      this.canvas.setZoom(scaleFactorY)
      this.setWhiteboardSize(width * scaleFactorY, height * scaleFactorY)
    } else {
      this.canvas.setWidth(width)
      this.canvas.setHeight(height)
      this.canvas.setZoom(1)
      this.setWhiteboardSize(width, height)
    }
    this.canvas.calcOffset()
    this.canvas.renderAll()
  }

  setWhiteboardSize(width: number, height: number) {
    setProperty('--wb-width', width)
    setProperty('--wb-height', height)
  }

  whiteboardIsDrawingMode(status: boolean) {
    this.canvas.isDrawingMode = status
    if (status) {
      this.wbIsEraser = false
    }
  }

  setupWhiteboardLocalListners() {
    this.canvas.on('mouse:down', (event) => {
      this.mouseDown(event)
    })
    this.canvas.on('mouse:up', () => {
      this.mouseUp()
    })
    this.canvas.on('mouse:move', () => {
      this.mouseMove()
    })
    this.canvas.on('object:added', () => {
      this.objectAdded()
    })
  }

  getWhiteboardAction(action: string) {
    return { action, roomId: local.value.roomId, roomName: local.value.roomName }
  }

  whiteboardAction(config: KeyValue) {
    if (this.client.peerCount > 0) {
      this.client.sendToServer('whiteboardAction', config)
    }
    this.handleWhiteboardAction(config, false)
  }

  canvasBackgroundColor(color: string) {
    this.canvas?.setBackgroundColor(color, () => {})
    this.canvas?.renderAll()
  }

  /**
   * Whiteboard: handle actions
   * @param {object} args data
   * @param {boolean} logMe popup action
   */
  handleWhiteboardAction(args: KeyValue, logMe: boolean = true) {
    const { peer_name, action, color } = args

    if (logMe) {
      console.log('toast', `${peer_name} \n whiteboard action: ${action}`)
    }
    switch (action) {
      case 'bgcolor':
        this.canvasBackgroundColor(color)
        break
      case 'undo':
        this.canvasUndo()
        break
      case 'redo':
        this.canvasRedo()
        break
      case 'clear':
        this.canvas.clear()
        break
      case 'toggle':
        this.toggleWhiteboard()
        break
      case 'lock':
        if (!this.client.isOwner) {
          this.wbDrawing(false)
          this.isLocked = true
        }
        break
      case 'unlock':
        if (!this.client.isOwner) {
          this.wbDrawing(true)
          this.isLocked = false
        }
        break
      // ...
      default:
        break
    }
  }

  canvasRedo() {
    if (this.wbPop.length > 0) {
      this.isRedoing = true
      this.canvas.add(this.wbPop.pop()!)
    }
  }

  toggleWhiteboard() {
    if (!this.isOpened) {
      playSound('newMessage')
    }
    this.isOpened = !this.isOpened
  }

  wbDrawing(status: boolean) {
    this.canvas.isDrawingMode = status
    this.canvas.selection = status
    this.canvas.forEachObject((obj) => {
      obj.selectable = status
    })
  }

  canvasUndo() {
    if (this.canvas._objects.length > 0) {
      this.wbPop.push(this.canvas._objects.pop()!)
      this.canvas.renderAll()
    }
  }

  mouseDown(event: fabric.IEvent<MouseEvent>) {
    this.wbIsDrawing = true
    if (this.wbIsEraser && event.target) {
      this.canvas.remove(event.target)
    }
  }

  mouseUp() {
    this.wbIsDrawing = false
    this.canvasToJson()
  }

  mouseMove() {
    if (this.wbIsEraser) {
      this.canvas.hoverCursor = 'not-allowed'
    } else {
      this.canvas.hoverCursor = 'move'
    }
  }

  objectAdded() {
    if (!this.wbIsRedoing) {
      this.wbPop = []
    }
    this.wbIsRedoing = false
  }

  addCanvasObject(object: fabric.Object) {
    if (object) {
      this.canvas.add(object)
      this.canvas.setActiveObject(object)
      this.whiteboardIsDrawingMode(false)
      this.canvasToJson()
    }
  }

  addObject(type: string, event?: Event) {
    if (type === 'imgUrl') {
      ElMessageBox.prompt('图像URL', '请输入', {
        inputPattern: /\.(jpeg|jpg|gif|png|tiff|bmp)$/,
        inputErrorMessage: '不是有效的图像URL',
      }).then(({ value }) => {
        fabric.Image.fromURL(value, (myImg) => {
          this.addCanvasObject(myImg)
        })
      }).catch(() => {})
    } else if (type === 'imgFile') {
      if (event) {
        const target = event.target as HTMLInputElement
        const file = target.files && target.files[0]
        if (file && file.size > 0) {
          const reader = new FileReader()
          reader.onload = (event) => {
            const img = new Image()
            img.src = event.target!.result as string
            img.onload = () => {
              const image = new fabric.Image(img)
              image.set({ top: 0, left: 0 }).scale(0.3)
              this.addCanvasObject(image)
            }
          }
          reader.readAsDataURL(file)
        }
      }
    } else if (type === 'pdfFile') {
      if (event) {
        const target = event.target as HTMLInputElement
        const file = target.files && target.files[0]
        if (file && file.size > 0) {
          const reader = new FileReader()
          reader.onload = async (event) => {
            this.canvas.requestRenderAll()
            await pdfToImage(event.target!.result, this.canvas)
            this.whiteboardIsDrawingMode(false)
            this.canvasToJson()
          }
          reader.readAsDataURL(file)
        }
      }
    } else if (type === 'text') {
      this.addCanvasObject(new fabric.IText('文本内容', {
        top: 0,
        left: 0,
        fontFamily: 'Comfortaa',
        fill: this.canvas.freeDrawingBrush.color,
        stroke: this.canvas.freeDrawingBrush.color,
        strokeWidth: this.canvas.freeDrawingBrush.width,
      }))
    } else if (type === 'line') {
      this.addCanvasObject(new fabric.Line([50, 100, 200, 200], {
        top: 0,
        left: 0,
        fill: this.canvas.freeDrawingBrush.color,
        stroke: this.canvas.freeDrawingBrush.color,
        strokeWidth: this.canvas.freeDrawingBrush.width,
      }))
    } else if (type === 'circle') {
      this.addCanvasObject(new fabric.Circle({
        radius: 50,
        fill: 'transparent',
        stroke: this.canvas.freeDrawingBrush.color,
        strokeWidth: this.canvas.freeDrawingBrush.width,
      }))
    } else if (type === 'rect') {
      this.addCanvasObject(new fabric.Rect({
        top: 0,
        left: 0,
        width: 150,
        height: 100,
        fill: 'transparent',
        stroke: this.canvas.freeDrawingBrush.color,
        strokeWidth: this.canvas.freeDrawingBrush.width,
      }))
    } else if (type === 'triangle') {
      this.addCanvasObject(new fabric.Triangle({
        top: 0,
        left: 0,
        width: 150,
        height: 100,
        fill: 'transparent',
        stroke: this.canvas.freeDrawingBrush.color,
        strokeWidth: this.canvas.freeDrawingBrush.width,
      }))
    }
  }

  canvasToJson() {
    if (!this.client.isOwner && this.isLocked) {
      return
    }
    if (this.client.peerCount > 0) {
      const config = {
        roomId: local.value.roomId,
        canvasJson: JSON.stringify(this.canvas?.toJSON()),
      }
      this.client.sendToServer('canvasToJson', config)
    }
  }
}
