import { storeToRefs } from 'pinia'
import { fabric } from 'fabric'
import { Client } from './client'
import { playSound } from '@/utils'

import { useWebrtcStore } from '@/store'

const webrtcStore = useWebrtcStore()
const {
  local,
} = storeToRefs(webrtcStore)

/**
 * 白板
 */
export class WhiteboardServer {
  static wbPop: fabric.Object[] = []
  static isOpened: boolean = false
  static isLocked: boolean = false
  static isRedoing: boolean = false
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
    if (!WhiteboardServer.isOpened) {
      playSound('newMessage')
    }
    WhiteboardServer.isOpened = !WhiteboardServer.isOpened
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
