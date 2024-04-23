import { useWebrtcStore } from '@/store'

const webrtcStore = useWebrtcStore()
export class WebSocketServer {
  private url: string
  private heartbeatInterval: number
  private reconnectInterval: number
  private socket: WebSocket | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null // 重连间隔 ms
  private heartbeatTimeout: NodeJS.Timeout | null = null // 心跳间隔 ms
  private onOpenCallback?: (event: Event) => void
  private onMessageCallback?: (type: string, args: KeyValue) => void
  private onErrorCallback?: (error: Event) => void
  private onCloseCallback?: (event: CloseEvent) => void

  constructor(url: string, heartbeatInterval: number = 30000, reconnectInterval: number = 3000) {
    this.url = url
    this.heartbeatInterval = heartbeatInterval
    this.reconnectInterval = reconnectInterval
    this.connect()
  }

  private connect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('[WebSocket]: 已连接')
      return
    }

    this.socket = new WebSocket(this.url)

    this.socket.onopen = (event) => {
      console.log('[WebSocket]: 连接成功')
      this.startHeartbeat()
      this.onOpenCallback?.(event)
    }

    this.socket.onmessage = (event) => {
      const { cmd, data } = JSON.parse(event.data)
      this.onMessageCallback?.(cmd, data)
      this.resetHeartbeat()
    }

    this.socket.onerror = (error) => {
      console.error('[WebSocket] 错误:', error)
      this.onErrorCallback?.(error)
    }

    this.socket.onclose = (event) => {
      console.log('[WebSocket]: 已关闭')
      this.stopHeartbeat()
      this.reconnect()
      this.onCloseCallback?.(event)
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval <= 0) {
      return
    }
    this.heartbeatTimeout = setTimeout(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        // 发送心跳信息
        this.send('heartbeat', { userId: webrtcStore.userId })
      }
      this.startHeartbeat()
    }, this.heartbeatInterval)
  }

  private resetHeartbeat(): void {
    clearTimeout(this.heartbeatTimeout!)
    this.startHeartbeat()
  }

  private stopHeartbeat(): void {
    clearTimeout(this.heartbeatTimeout!)
  }

  private reconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }
    console.log('[WebSocket] 尝试重新连接...')
    this.reconnectTimeout = setTimeout(() => {
      this.connect()
    }, this.reconnectInterval)
  }

  public send(cmd: string, message: KeyValue = {}): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const seq = Date.now().toString()
      this.socket.send(JSON.stringify({ seq, cmd, data: message || {} }))
    } else {
      console.error('[WebSocket]未打开, 消息未能发送:', message)
    }
  }

  public onOpen(callback: (event: Event) => void): void {
    this.onOpenCallback = callback
  }

  public onMessage(callback: (action: string, args: KeyValue) => void): void {
    this.onMessageCallback = callback
  }

  public onError(callback: (error: Event) => void): void {
    this.onErrorCallback = callback
  }

  public onClose(callback: (event: CloseEvent) => void): void {
    this.onCloseCallback = callback
  }

  public close(): void {
    if (this.socket) {
      this.stopHeartbeat()
      this.socket.close()
    }
    clearTimeout(this.reconnectTimeout!)
  }
}
