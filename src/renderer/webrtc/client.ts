import { type Socket, io } from 'socket.io-client'
import { MediaServer } from './media'
/**
 * Webrtc 客户端
 */
export class Client {
  declare mediaServer: MediaServer
  declare roomId: string
  declare peerId: string
  declare peerName: string
  declare peerUuid: string
  declare isPresenter: string

  declare socket: Socket

  peerConnections: { [key: string]: RTCPeerConnection } = {}

  // peer 连接数
  get peerConnectCount() {
    return Object.keys(this.peerConnections).length
  }

  constructor() {
    console.log('01. 连接到信令服务器')
  }

  start() {
    this.socket = io('ws://localhost:8081', {
      path: '/webrtc/p2p',
      transports: ['websocket'],
    })

    const transport = this.socket.io.engine.transport.name
    console.log('02. 连接到', transport)

    this.socket.on('connect', this.handleConnect.bind(this))
  }

  setMedia(videoElement: HTMLVideoElement, audioElement: HTMLAudioElement, volumeElement: HTMLDivElement) {
    this.mediaServer = new MediaServer(videoElement, audioElement, volumeElement)
  }

  async handleConnect() {
    console.log('03. 信令服务器连接成功')
    this.mediaServer && await this.mediaServer.start()

    this.peerId = this.socket.id!
  }

  sendToServer(msg: string, args = {}) {
    this.socket.emit(msg, args)
  }
}
