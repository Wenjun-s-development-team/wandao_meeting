import { fabric } from 'fabric'
import type { Client } from './client'
import { playSound } from '@/utils'

/**
 * 白板
 */
export class WhiteboardServer {
  client: Client
  wbPop: fabric.Object[] = []
  isOpened: boolean = false
  isLocked: boolean = false
  isRedoing: boolean = false
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

  getWhiteboardAction(action: string) {
    return { action, roomId: this.client.roomId, roomName: this.client.roomName }
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

  wbCanvasToJson() {
    if (!this.client.isOwner && this.isLocked) {
      return
    }
    if (this.client.peerCount > 0) {
      const config = {
        roomId: this.client.roomId,
        wbCanvasJson: JSON.stringify(this.wbCanvas?.toJSON()),
      }
      this.client.sendToServer('wbCanvasToJson', config)
    }
  }
}
