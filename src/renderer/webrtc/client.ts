import { type Socket, io } from 'socket.io-client'
import { storeToRefs } from 'pinia'
import { ChatServer, FileSharingServer, MediaServer, WhiteboardServer } from './'

import { playSound } from '@/utils'
import { useWebrtcStore } from '@/store'

const query = useUrlSearchParams('hash')
const webrtcStore = useWebrtcStore()
const {
  useVideo,
  useAudio,
  useScreen,
  handStatus,
  recordStatus,
  privacyStatus,
} = storeToRefs(webrtcStore)

/**
 * Webrtc 客户端
 */
export class Client {
  declare chatServer: ChatServer
  declare mediaServer: MediaServer
  declare fileSharingServer: FileSharingServer
  declare whiteboardServer: WhiteboardServer

  declare roomId: string
  declare clientId: string
  declare peerName: string
  declare peerUuid: string
  // 是否主持人
  declare isPresenter: string

  declare socket: Socket

  allPeers: KeyValue = {}
  peerConnections: { [key: string]: RTCPeerConnection } = {}
  needToCreateOffer: boolean = false

  // peer 连接数
  get peerConnectCount() {
    return Object.keys(this.peerConnections).length
  }

  constructor() {
    console.log('01. 连接到信令服务器')
    this.chatServer = new ChatServer(this)
    this.mediaServer = new MediaServer(this)
    this.fileSharingServer = new FileSharingServer(this)
    this.whiteboardServer = new WhiteboardServer(this)
  }

  start() {
    this.socket = io('ws://localhost:8686', {
      path: '/webrtc/p2p',
      transports: ['websocket'],
    })

    const transport = this.socket.io.engine.transport.name
    console.log('02. 连接到', transport)

    this.socket.on('connect', this.handleConnect.bind(this))
    this.socket.on('createPeer', this.handleCreatePeer.bind(this))
  }

  // 连接成功
  async handleConnect() {
    console.log('03. 信令服务器连接成功')
    this.mediaServer && await this.mediaServer.start()
    this.clientId = this.socket.id!
    this.peerName = 'admin'
    this.peerUuid = '001'
    this.roomId = query.roomId as string
    this.joinToRoom()
  }

  // 进入房间
  async joinToRoom() {
    console.log('12. join to room', this.roomId)
    this.sendToServer('join', {
      roomId: this.roomId,
      roomPasswd: '',
      peerToken: '',
      peerUuid: this.peerUuid,
      peerName: this.peerName,
      peerVideo: useVideo.value,
      peerAudio: useAudio.value,
      peerScreen: useScreen.value,
      peerHandStatus: handStatus.value,
      peerRecordStatus: recordStatus.value,
      peerPrivacyStatus: privacyStatus.value,
    })
  }

  /**
   * 当加入一个房间后，收到信令服务器发送的 createPeer 事件
   * @param {object} args data
   */
  async handleCreatePeer(args: KeyValue) {
    const { clientId, shouldCreateOffer, iceServers, peers } = args
    const { peerName, peerVideo } = peers[clientId]

    if (clientId in this.peerConnections) {
      return console.log('Already connected to peer', clientId)
    }

    console.log('iceServers', iceServers[0])

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
    const peerConnection = new RTCPeerConnection({ iceServers })
    this.peerConnections[clientId] = peerConnection
    this.allPeers = peers

    console.log('[RTCPeerConnection] - clientId', clientId)
    console.log('[RTCPeerConnection] - PEER-CONNECTIONS', this.peerConnections)
    console.log('[RTCPeerConnection] - PEERS', peers)

    // 谁与我连接
    const connectedPeersName: string[] = []
    for (const id in this.peerConnections) {
      connectedPeersName.push(peers[id].peerName)
    }
    console.log('[RTCPeerConnection] - CONNECTED TO PEERS', JSON.stringify(connectedPeersName))

    // TODO 在聊天室列表中添加参与者 peers
    await this.logConnectionStatus(clientId)
    await this.handleOnIceCandidate(clientId)
    await this.handleRTCDataChannels(clientId)
    await this.mediaServer.handleOnTrack(clientId, peers)
    await this.mediaServer.handleAddTracks(clientId)

    if (!peerVideo && !this.needToCreateOffer) {
      this.needToCreateOffer = true
    }
    if (shouldCreateOffer) {
      await this.handleCreateRTCOffer(clientId)
      console.log('[RTCPeerConnection] - SHOULD CREATE OFFER', { clientId, peerName })
    }

    if (!peerVideo) {
      await this.mediaServer.loadRemoteMediaStream(new MediaStream(), peers, clientId, 'video')
    }

    await this.whiteboardServer.onUpdate()
    playSound('createPeer')
  }

  /**
   * 打印 RTC 连接状态
   * @param {string} clientId socket.id
   */
  async logConnectionStatus(clientId: string) {
    this.peerConnections[clientId].onconnectionstatechange = () => {
      const connectionStatus = this.peerConnections[clientId].connectionState
      const signalingState = this.peerConnections[clientId].signalingState
      const peerName = this.allPeers[clientId].peerName
      console.log('[RTCPeerConnection] - CONNECTION', {
        clientId,
        peerName,
        connectionStatus,
        signalingState,
      })
    }
  }

  /**
   * onICECandidate 处理 ICE 候选人
   * TODO 将 stun | turn 连接状态更新到UI
   * @param {string} clientId socket.id
   */
  async handleOnIceCandidate(clientId: string) {
    this.peerConnections[clientId].onicecandidate = (event) => {
      if (!event.candidate || !event.candidate.candidate) {
        return
      }

      const { type, candidate, sdpMLineIndex } = event.candidate

      console.log('[ICE candidate]', event.candidate)

      this.sendToServer('relayICE', {
        clientId,
        iceCandidate: {
          sdpMLineIndex,
          candidate,
        },
      })

      if (['host', 'srflx', 'relay'].includes(type!)) {
        // networkStun.innerText = '🟢'
      } else {
        console.warn(`[ICE candidate] unknown type: ${type}`, candidate)
      }
    }

    // handle ICE candidate errors
    this.peerConnections[clientId].onicecandidateerror = (event) => {
      const { url, errorText } = event

      console.warn('[ICE candidate] error', { url, error: errorText })

      if (url.startsWith('host:')) {
        // networkHost.innerText = '🔴'
      }
      if (url.startsWith('stun:')) {
        // networkStun.innerText = '🔴'
      }
      if (url.startsWith('turn:')) {
        // networkTurn.innerText = '🔴'
      }
    }
  }

  /**
   * onDataChannel 创建 RTC 数据通道
   * @param {string} clientId socket.id
   */
  async handleRTCDataChannels(clientId: string) {
    this.peerConnections[clientId].ondatachannel = (event) => {
      console.log(`handleRTCDataChannels ${clientId}`, event)
      event.channel.onmessage = (msg) => {
        switch (event.channel.label) {
          case 'chat_channel':
            try {
              const dataMessage = JSON.parse(msg.data)
              switch (dataMessage.type) {
                case 'chat':
                  this.chatServer.onMessage(dataMessage)
                  break
                case 'speech':
                  this.chatServer.onSpeech(dataMessage)
                  break
                case 'micVolume':
                  this.chatServer.onVolume(dataMessage)
                  break
                default:
                  break
              }
            } catch (err) {
              console.error('chat_channel', err)
            }
            break
          case 'file_sharing_channel':
            this.fileSharingServer.onMessage(msg.data)
            break
          default:
            break
        }
      }
    }
    await this.chatServer.createDataChannel(clientId)
    await this.fileSharingServer.createDataChannel(clientId)
  }

  /**
   * onNegotiationneeded 创建 offer 并应答一个 sessionDescription
   * 当需要通过信令通道进行连接协商时， 将发送一个 negotiationneeded事件
   * @param {string} clientId socket.id
   */
  async handleCreateRTCOffer(clientId: string) {
    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/onnegotiationneeded
    this.peerConnections[clientId].onnegotiationneeded = () => {
      console.log(`Creating RTC offer to ${this.allPeers[clientId].peerName}`)
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer
      this.peerConnections[clientId].createOffer().then((localDescription) => {
        console.log('Local offer description is', localDescription)
        // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setLocalDescription
        this.peerConnections[clientId].setLocalDescription(localDescription).then(() => {
          this.sendToServer('relaySDP', {
            clientId,
            sessionDescription: localDescription,
          })
          console.log('Offer setLocalDescription done!')
        }).catch((err) => {
          console.error('[Error] offer setLocalDescription', err)
        })
      }).catch((err) => {
        console.error('[Error] sending offer', err)
      })
    }
  }

  sendToServer(msg: string, args = {}) {
    this.socket.emit(msg, args)
  }
}
