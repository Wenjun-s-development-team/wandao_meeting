import { storeToRefs } from 'pinia'
import { fabric } from 'fabric'
import type { Client } from './client'
import { playSound, setProperty } from '@/utils'

import { useWebrtcStore } from '@/store'

const webrtcStore = useWebrtcStore()
const {
  local,
} = storeToRefs(webrtcStore)

/**
 * 白板
 */
export class WhiteboardServer {
  client: Client
  wbPop: fabric.Object[] = []
  isOpened: boolean = false
  isLocked: boolean = false
  isRedoing: boolean = false
  wbIsDrawing: boolean = false
  wbIsEraser: boolean = false
  wbIsRedoing: boolean = false
  wbCanvas: fabric.Canvas = new fabric.Canvas('wbCanvas')

  constructor(client: Client) {
    this.client = client
  }

  /**
   * 如果白板打开，则将画布更新到所有P2P连接中
   */
  async onUpdate() {
    if (this.isOpened && this.client.peerCount > 0) {
      this.wbCanvasToJson()
      this.whiteboardAction(this.getWhiteboardAction(this.isLocked ? 'lock' : 'unlock'))
    }
  }

  setupWhiteboard(element: string, width: number = 1200, height: number = 600) {
    this.setupWhiteboardCanvas(element)
    this.setupWhiteboardCanvasSize(width, height)
    this.setupWhiteboardLocalListners()
  }

  setupWhiteboardCanvas(element: string) {
    this.wbCanvas = new fabric.Canvas(element)
    this.wbCanvas.freeDrawingBrush.color = '#FFFFFF'
    this.wbCanvas.freeDrawingBrush.width = 3
    this.whiteboardIsDrawingMode(true)
  }

  setupWhiteboardCanvasSize(width: number, height: number) {
    const scaleFactorX = window.innerWidth / width
    const scaleFactorY = window.innerHeight / height
    if (scaleFactorX < scaleFactorY && scaleFactorX < 1) {
      this.wbCanvas.setWidth(width * scaleFactorX)
      this.wbCanvas.setHeight(height * scaleFactorX)
      this.wbCanvas.setZoom(scaleFactorX)
      this.setWhiteboardSize(width * scaleFactorX, height * scaleFactorX)
    } else if (scaleFactorX > scaleFactorY && scaleFactorY < 1) {
      this.wbCanvas.setWidth(width * scaleFactorY)
      this.wbCanvas.setHeight(height * scaleFactorY)
      this.wbCanvas.setZoom(scaleFactorY)
      this.setWhiteboardSize(width * scaleFactorY, height * scaleFactorY)
    } else {
      this.wbCanvas.setWidth(width)
      this.wbCanvas.setHeight(height)
      this.wbCanvas.setZoom(1)
      this.setWhiteboardSize(width, height)
    }
    this.wbCanvas.calcOffset()
    this.wbCanvas.renderAll()
  }

  setWhiteboardSize(width: number, height: number) {
    setProperty('--wb-width', width)
    setProperty('--wb-height', height)
  }

  whiteboardIsDrawingMode(status: boolean) {
    this.wbCanvas.isDrawingMode = status
    if (status) {
      this.wbIsEraser = false
    }
  }

  setupWhiteboardLocalListners() {
    this.wbCanvas.on('mouse:down', (event) => {
      this.mouseDown(event)
    })
    this.wbCanvas.on('mouse:up', () => {
      this.mouseUp()
    })
    this.wbCanvas.on('mouse:move', () => {
      this.mouseMove()
    })
    this.wbCanvas.on('object:added', () => {
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

  wbCanvasBackgroundColor(color: string) {
    this.wbCanvas?.setBackgroundColor(color, () => {})
    this.wbCanvas?.renderAll()
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
        this.wbCanvasBackgroundColor(color)
        break
      case 'undo':
        this.wbCanvasUndo()
        break
      case 'redo':
        this.wbCanvasRedo()
        break
      case 'clear':
        this.wbCanvas.clear()
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

  wbCanvasRedo() {
    if (this.wbPop.length > 0) {
      this.isRedoing = true
      this.wbCanvas.add(this.wbPop.pop()!)
    }
  }

  toggleWhiteboard() {
    if (!this.isOpened) {
      playSound('newMessage')
    }
    this.isOpened = !this.isOpened
  }

  wbDrawing(status: boolean) {
    this.wbCanvas.isDrawingMode = status
    this.wbCanvas.selection = status
    this.wbCanvas.forEachObject((obj) => {
      obj.selectable = status
    })
  }

  wbCanvasUndo() {
    if (this.wbCanvas._objects.length > 0) {
      this.wbPop.push(this.wbCanvas._objects.pop()!)
      this.wbCanvas.renderAll()
    }
  }

  mouseDown(event: fabric.IEvent<MouseEvent>) {
    this.wbIsDrawing = true
    if (this.wbIsEraser && event.target) {
      this.wbCanvas.remove(event.target)
    }
  }

  mouseUp() {
    this.wbIsDrawing = false
    this.wbCanvasToJson()
  }

  mouseMove() {
    if (this.wbIsEraser) {
      this.wbCanvas.hoverCursor = 'not-allowed'
    } else {
      this.wbCanvas.hoverCursor = 'move'
    }
  }

  objectAdded() {
    if (!this.wbIsRedoing) {
      this.wbPop = []
    }
    this.wbIsRedoing = false
  }

  wbCanvasToJson() {
    if (!this.client.isOwner && this.isLocked) {
      return
    }
    if (this.client.peerCount > 0) {
      const config = {
        roomId: local.value.roomId,
        wbCanvasJson: JSON.stringify(this.wbCanvas?.toJSON()),
      }
      this.client.sendToServer('wbCanvasToJson', config)
    }
  }
}
