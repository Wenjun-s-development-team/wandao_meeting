import { storeToRefs } from 'pinia'
import { fabric } from 'fabric'
import { Client } from './client'
import { setProperty } from '@/utils'

import { useWebrtcStore } from '@/store'

const webrtcStore = useWebrtcStore()
const {
  local,
  showWhiteboard,
} = storeToRefs(webrtcStore)

/**
 * 白板
 */
export class WhiteboardServer {
  static wbPop: fabric.Object[] = []
  static isOpened: boolean = false
  static isLocked: boolean = false
  static isRedoing: boolean = false
  static wbIsEraser: boolean = false
  static wbIsDrawing: boolean = false
  static wbIsRedoing: boolean = false
  static wbCanvas: fabric.Canvas = new fabric.Canvas('wbCanvas')

  /**
   * 如果白板打开，则将画布更新到所有P2P连接中
   */
  static async onUpdate() {
    if (WhiteboardServer.isOpened && Client.peerCount() > 0) {
      WhiteboardServer.wbCanvasToJson()
      WhiteboardServer.whiteboardAction(WhiteboardServer.getWhiteboardAction(WhiteboardServer.isLocked ? 'lock' : 'unlock'))
    }
  }

  static setupWhiteboard(element: string, width: number = 1200, height: number = 600) {
    WhiteboardServer.setupWhiteboardCanvas(element)
    WhiteboardServer.setupWhiteboardCanvasSize(width, height)
    WhiteboardServer.setupWhiteboardLocalListners()
  }

  static setupWhiteboardCanvas(element: string) {
    WhiteboardServer.wbCanvas = new fabric.Canvas(element)
    WhiteboardServer.wbCanvas.freeDrawingBrush.color = '#FFFFFF'
    WhiteboardServer.wbCanvas.freeDrawingBrush.width = 3
    WhiteboardServer.whiteboardIsDrawingMode(true)
  }

  static setupWhiteboardCanvasSize(width: number = 1200, height: number = 600) {
    const scaleFactorX = window.innerWidth / width
    const scaleFactorY = window.innerHeight / height
    if (scaleFactorX < scaleFactorY && scaleFactorX < 1) {
      WhiteboardServer.wbCanvas.setWidth(width * scaleFactorX)
      WhiteboardServer.wbCanvas.setHeight(height * scaleFactorX)
      WhiteboardServer.wbCanvas.setZoom(scaleFactorX)
      WhiteboardServer.setWhiteboardSize(width * scaleFactorX, height * scaleFactorX)
    } else if (scaleFactorX > scaleFactorY && scaleFactorY < 1) {
      WhiteboardServer.wbCanvas.setWidth(width * scaleFactorY)
      WhiteboardServer.wbCanvas.setHeight(height * scaleFactorY)
      WhiteboardServer.wbCanvas.setZoom(scaleFactorY)
      WhiteboardServer.setWhiteboardSize(width * scaleFactorY, height * scaleFactorY)
    } else {
      WhiteboardServer.wbCanvas.setWidth(width)
      WhiteboardServer.wbCanvas.setHeight(height)
      WhiteboardServer.wbCanvas.setZoom(1)
      WhiteboardServer.setWhiteboardSize(width, height)
    }
    WhiteboardServer.wbCanvas.calcOffset()
    WhiteboardServer.wbCanvas.renderAll()
  }

  static setWhiteboardSize(w, h) {
    setProperty('--wb-width', w)
    setProperty('--wb-height', h)
  }

  static setupWhiteboardLocalListners() {
    WhiteboardServer.wbCanvas.on('mouse:down', (e) => {
      WhiteboardServer.mouseDown(e)
    })
    WhiteboardServer.wbCanvas.on('mouse:up', () => {
      WhiteboardServer.mouseUp()
    })
    WhiteboardServer.wbCanvas.on('mouse:move', () => {
      WhiteboardServer.mouseMove()
    })
    WhiteboardServer.wbCanvas.on('object:added', () => {
      WhiteboardServer.objectAdded()
    })
  }

  static whiteboardIsDrawingMode(status: boolean) {
    WhiteboardServer.wbCanvas.isDrawingMode = status
    if (status) {
      // setColor(whiteboardPencilBtn, 'green') // 画笔
      // setColor(whiteboardObjectBtn, 'white') // 鼠标
      // setColor(whiteboardEraserBtn, 'white') // 橡皮擦
      WhiteboardServer.wbIsEraser = false
    } else {
      // setColor(whiteboardPencilBtn, 'white')
      // setColor(whiteboardObjectBtn, 'green')
    }
  }

  static getWhiteboardAction(action: string) {
    return { action, roomId: local.value.roomId, roomName: local.value.roomName }
  }

  static whiteboardAction(config: KeyValue) {
    if (Client.peerCount() > 0) {
      Client.sendToServer('whiteboardAction', config)
    }
    WhiteboardServer.handleWhiteboardAction(config, false)
  }

  static wbCanvasBackgroundColor(color: string) {
    WhiteboardServer.wbCanvas?.setBackgroundColor(color, () => {})
    WhiteboardServer.wbCanvas?.renderAll()
  }

  static mouseDown(e: fabric.IEvent<MouseEvent>) {
    WhiteboardServer.wbIsDrawing = true
    if (WhiteboardServer.wbIsEraser && e.target) {
      WhiteboardServer.wbCanvas.remove(e.target)
    }
  }

  static mouseUp() {
    WhiteboardServer.wbIsDrawing = false
    WhiteboardServer.wbCanvasToJson()
  }

  static mouseMove() {
    if (WhiteboardServer.wbIsEraser) {
      WhiteboardServer.wbCanvas.hoverCursor = 'not-allowed'
    } else {
      WhiteboardServer.wbCanvas.hoverCursor = 'move'
    }
  }

  static objectAdded() {
    if (!WhiteboardServer.wbIsRedoing) {
      WhiteboardServer.wbPop = []
    }
    WhiteboardServer.wbIsRedoing = false
  }

  /**
   * Whiteboard: handle actions
   * @param {object} args data
   * @param {boolean} logMe popup action
   */
  static handleWhiteboardAction(args: KeyValue, logMe: boolean = true) {
    const { peer_name, action, color } = args

    if (logMe) {
      console.log('toast', `${peer_name} \n whiteboard action: ${action}`)
    }
    switch (action) {
      case 'bgcolor':
        WhiteboardServer.wbCanvasBackgroundColor(color)
        break
      case 'undo':
        WhiteboardServer.wbCanvasUndo()
        break
      case 'redo':
        WhiteboardServer.wbCanvasRedo()
        break
      case 'clear':
        WhiteboardServer.wbCanvas.clear()
        break
      case 'toggle':
        WhiteboardServer.toggleWhiteboard()
        break
      case 'lock':
        if (!Client.isOwner) {
          WhiteboardServer.wbDrawing(false)
          WhiteboardServer.isLocked = true
        }
        break
      case 'unlock':
        if (!Client.isOwner) {
          WhiteboardServer.wbDrawing(true)
          WhiteboardServer.isLocked = false
        }
        break
      // ...
      default:
        break
    }
  }

  static wbCanvasRedo() {
    if (WhiteboardServer.wbPop.length > 0) {
      WhiteboardServer.isRedoing = true
      WhiteboardServer.wbCanvas.add(WhiteboardServer.wbPop.pop()!)
    }
  }

  static toggleWhiteboard() {
    showWhiteboard.value = !showWhiteboard.value
  }

  static wbDrawing(status: boolean) {
    WhiteboardServer.wbCanvas.isDrawingMode = status
    WhiteboardServer.wbCanvas.selection = status
    WhiteboardServer.wbCanvas.forEachObject((obj) => {
      obj.selectable = status
    })
  }

  static wbCanvasUndo() {
    if (WhiteboardServer.wbCanvas._objects.length > 0) {
      WhiteboardServer.wbPop.push(WhiteboardServer.wbCanvas._objects.pop()!)
      WhiteboardServer.wbCanvas.renderAll()
    }
  }

  static wbCanvasToJson() {
    if (!Client.isOwner && WhiteboardServer.isLocked) {
      return
    }
    if (Client.peerCount() > 0) {
      const config = {
        roomId: local.value.roomId,
        wbCanvasJson: JSON.stringify(WhiteboardServer.wbCanvas?.toJSON()),
      }
      Client.sendToServer('wbCanvasToJson', config)
    }
  }
}
