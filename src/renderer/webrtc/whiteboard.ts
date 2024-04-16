import { fabric } from 'fabric'
import type { Client } from './client'
import { playSound } from '@/utils'

/**
 * 白板
 */
export class Whiteboard {
  client: Client
  wbPop: fabric.Object[] = []
  wbIsOpen: boolean = false
  wbIsLock: boolean = false
  wbIsRedoing: boolean = false
  wbCanvas: fabric.Canvas = new fabric.Canvas('wbCanvas')

  constructor(client: Client) {
    this.client = client
  }

  /**
   * 白板
   */
  async wbUpdate() {
    if (this.wbIsOpen && this.client.peerConnectCount > 0) {
      this.wbCanvasToJson()
      this.whiteboardAction(this.getWhiteboardAction(this.wbIsLock ? 'lock' : 'unlock'))
    }
  }

  getWhiteboardAction(action) {
    return {
      roomId: this.client.roomId,
      peerName: this.client.peerName,
      action,
    }
  }

  whiteboardAction(config) {
    if (this.client.peerConnectCount > 0) {
      this.client.sendToServer('whiteboardAction', config)
    }
    this.handleWhiteboardAction(config, false)
  }

  wbCanvasBackgroundColor(color) {
    // setSP('--wb-bg', color)
    // wbBackgroundColorEl.value = color
    this.wbCanvas?.setBackgroundColor(color, () => {})
    this.wbCanvas?.renderAll()
  }

  /**
   * Whiteboard: handle actions
   * @param {object} config data
   * @param {boolean} logMe popup action
   */
  handleWhiteboardAction(config, logMe = true) {
    const { peer_name, action, color } = config

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
        if (!this.client.isPresenter) {
          this.wbDrawing(false)
          this.wbIsLock = true
        }
        break
      case 'unlock':
        if (!this.client.isPresenter) {
          this.wbDrawing(true)
          this.wbIsLock = false
        }
        break
      // ...
      default:
        break
    }
  }

  wbCanvasRedo() {
    if (this.wbPop.length > 0) {
      this.wbIsRedoing = true
      this.wbCanvas.add(this.wbPop.pop()!)
    }
  }

  toggleWhiteboard() {
    if (!this.wbIsOpen) {
      playSound('newMessage')
    }

    // this.whiteboard.classList.toggle('show')
    // this.whiteboard.style.top = '50%'
    // this.whiteboard.style.left = '50%'
    this.wbIsOpen = !this.wbIsOpen
  }

  wbDrawing(status) {
    this.wbCanvas.isDrawingMode = status // Disable free drawing
    this.wbCanvas.selection = status // Disable object selection
    this.wbCanvas.forEachObject((obj) => {
      obj.selectable = status // Make all objects unselectable
    })
  }

  wbCanvasUndo() {
    if (this.wbCanvas._objects.length > 0) {
      this.wbPop.push(this.wbCanvas._objects.pop()!)
      this.wbCanvas.renderAll()
    }
  }

  wbCanvasToJson() {
    if (!this.client.isPresenter && this.wbIsLock) {
      return
    }
    if (this.client.peerConnectCount > 0) {
      const config = {
        roomId: this.client.roomId,
        wbCanvasJson: JSON.stringify(this.wbCanvas?.toJSON()),
      }
      this.client.sendToServer('wbCanvasToJson', config)
    }
  }
}
