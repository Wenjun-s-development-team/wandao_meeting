import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { ChatServer, FileSharingServer, MediaServer, WebSocketServer, WhiteboardServer } from '.'
import { playSound } from '@/utils'
import { useWebrtcStore } from '@/store'

const router = useRouter()
const webrtcStore = useWebrtcStore()
const {
  local,
  remotePeers,
  iceNetwork,
} = storeToRefs(webrtcStore)

/**
 * Webrtc 客户端
 */
export class Client {
  declare chatServer: ChatServer
  declare mediaServer: MediaServer
  declare fileSharingServer: FileSharingServer
  declare whiteboardServer: WhiteboardServer

  declare socket: WebSocketServer

  allPeers: KeyValue = {}
  peerConnections: { [key: string]: RTCPeerConnection } = {}
  needToCreateOffer: boolean = false

  isRoomLocked: boolean = false
  isHostProtected: boolean = false
  isPeerAuthEnabled: boolean = false
  isPeerReconnected: boolean = false
  isOwner: boolean = false // 是否主持人
  isRulesActive = true // 是否主持人可以做任何事情 false 所有人平等
  userLimits: KeyValue = {
    // 是否限制每个房间的用户数
    active: false,
    // 限制数量
    count: 2,
  }

  // peer 连接数
  get peerCount() {
    return Object.keys(this.peerConnections).length
  }

  constructor() {
    console.log('01. 创建服务')
    this.chatServer = new ChatServer(this)
    this.mediaServer = new MediaServer(this)
    this.fileSharingServer = new FileSharingServer(this)
    this.whiteboardServer = new WhiteboardServer(this)
  }

  start() {
    console.log('02. 连接到信令服务器')
    this.socket = new WebSocketServer(import.meta.env.RENDERER_VITE_WEBRTC_URL)
    this.socket.onOpen(this.handleConnect.bind(this))
    this.socket.onMessage(this.onMessage.bind(this))
    this.socket.onClose(this.handleDisconnect.bind(this))
  }

  onMessage(cmd: string, args: KeyValue) {
    switch (cmd) {
      case 'createRTCPeerConnection':
        this.createRTCPeerConnection(args)
        break
      case 'unauthorized':
        this.handleUnauthorized()
        break
      case 'roomIsLocked':
        this.handleUnlockTheRoom()
        break
      case 'roomAction':
        this.handleRoomAction(args)
        break
      case 'serverInfo':
        this.handleServerInfo(args)
        break
      case 'sessionDescription':
        this.handleSessionDescription(args)
        break
      case 'iceCandidate':
        this.handleIceCandidate(args)
        break
      case 'userName':
        this.handleuserName(args)
        break
      case 'peerStatus':
        this.handlePeerStatus(args)
        break
      case 'peerAction':
        this.handlePeerAction(args)
        break
      case 'message':
        this.handleMessage(args)
        break
      case 'wbCanvasToJson':
        this.handleJsonToWbCanvas(args)
        break
      case 'whiteboardAction':
        this.handleWhiteboardAction(args)
        break
      case 'kickOut':
        this.handleKickedOut(args)
        break
      case 'fileInfo':
        this.handleFileInfo(args)
        break
      case 'fileAbort':
        this.handleFileAbort()
        break
      case 'videoPlayer':
        this.handleVideoPlayer(args)
        break
      case 'disconnect':
        this.handleDisconnect(args)
        break
      case 'exit':
        this.handleRemovePeer(args)
        break
      default:
        break
    }
  }

  // 连接成功
  async handleConnect() {
    console.log('03. 信令服务器连接成功')
    if (this.mediaServer.localVideoStream && this.mediaServer.localAudioStream) {
      this.login()
    } else {
      await this.mediaServer.start()
      this.login()
    }
  }

  // 进入房间
  async login() {
    console.log('12. join to room', local.value.roomId)
    this.sendToServer('login', {
      token: '',

      roomId: local.value.roomId,
      roomName: local.value.roomName,
      roomLock: local.value.roomLock,
      roomPasswd: local.value.roomPasswd,

      userId: local.value.userId,
      userName: local.value.userName,
      userLock: local.value.userLock,

      useVideo: local.value.useVideo,
      useAudio: local.value.useAudio,

      audioStatus: local.value.audioStatus,
      videoStatus: local.value.videoStatus,
      screenStatus: local.value.screenStatus,

      handStatus: local.value.handStatus,
      recordStatus: local.value.recordStatus,
      privacyStatus: local.value.privacyStatus,
    })
  }

  handleDisconnect(args: KeyValue) {
    console.log('Disconnected from signaling server', { args })

    // 录音相关的UI
    // checkRecording()

    remotePeers.value = {}

    for (const userId in this.peerConnections) {
      this.peerConnections[userId].close()
    }

    this.chatServer.cleanDataChannel()
    this.fileSharingServer.cleanDataChannel()
    this.peerConnections = {}

    this.isPeerReconnected = true
  }

  handleRemovePeer(args: KeyValue) {
    console.log('Signaling server said to remove peer:', args)

    const { userId } = args

    if (userId in this.peerConnections) {
      this.peerConnections[userId].close()
    }

    delete this.allPeers[userId]
    delete this.peerConnections[userId]
    delete remotePeers.value[userId]

    this.chatServer.removeDataChannel(userId)
    this.fileSharingServer.removeDataChannel(userId)

    playSound('removePeer')
    console.log('ALL PEERS', this.allPeers)
  }

  /**
   * 当加入一个房间后，收到信令服务器发送的 createRTCPeerConnection 事件
   * @param {object} args data
   */
  async createRTCPeerConnection(args: KeyValue) {
    const { userId, shouldCreateOffer, iceServers, peers } = args
    const { userName, useVideo } = peers[userId]

    if (userId in this.peerConnections) {
      return console.log('Already connected to peer', userId)
    }

    console.log('iceServers', iceServers.map((serv: KeyValue) => serv.urls))

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
    const peerConnection = new RTCPeerConnection({ iceServers })
    this.peerConnections[userId] = peerConnection
    this.allPeers = peers

    console.log('[RTCPeerConnection] - userId', userId)
    console.log('[RTCPeerConnection] - PEER-CONNECTIONS', this.peerConnections)
    console.log('[RTCPeerConnection] - PEERS', peers)

    // 谁与我连接
    const connectedPeersName: string[] = []
    for (const id in this.peerConnections) {
      connectedPeersName.push(peers[id].userName)
    }
    console.log('[RTCPeerConnection] - CONNECTED TO PEERS', JSON.stringify(connectedPeersName))

    // TODO 在聊天室列表中添加参与者 peers
    await this.logConnectionStatus(userId)
    await this.handleOnIceCandidate(userId)
    await this.handleRTCDataChannels(userId)
    await this.mediaServer.handleOnTrack(userId, peers)
    await this.mediaServer.handleAddTracks(userId)

    if (!useVideo && !this.needToCreateOffer) {
      this.needToCreateOffer = true
    }
    if (shouldCreateOffer) {
      await this.handleCreateRTCOffer(userId)
      console.log('[RTCPeerConnection] - SHOULD CREATE OFFER', { userId, userName })
    }

    // 如果对方无视频设备
    if (!useVideo) {
      await this.mediaServer.loadRemoteMediaStream(new MediaStream(), peers, userId, 'video')
    }

    await this.whiteboardServer.onUpdate()
    playSound('createPeer')
  }

  /**
   * 打印 RTC 连接状态
   * @param {string} userId socket.id
   */
  async logConnectionStatus(userId: number) {
    this.peerConnections[userId].onconnectionstatechange = () => {
      const connectionStatus = this.peerConnections[userId].connectionState
      const signalingState = this.peerConnections[userId].signalingState
      const userName = this.allPeers[userId].userName
      console.log('[RTCPeerConnection] - CONNECTION', {
        userId,
        userName,
        connectionStatus,
        signalingState,
      })
    }
  }

  /**
   * onICECandidate 处理 ICE 候选人
   * @param {string} userId socket.id
   */
  async handleOnIceCandidate(userId: number) {
    this.peerConnections[userId].onicecandidate = (event) => {
      if (!event.candidate || !event.candidate.candidate) {
        return
      }

      const { type, candidate, sdpMLineIndex } = event.candidate

      // console.log('[ICE candidate]', event.candidate)

      this.sendToServer('relayICE', {
        userId,
        iceCandidate: {
          sdpMLineIndex,
          candidate,
        },
      })

      if (['host', 'srflx', 'relay'].includes(type!)) {
        iceNetwork.value.stun = true
      } else {
        console.warn(`[ICE candidate] unknown type: ${type}`, candidate)
      }
    }

    // handle ICE candidate errors
    this.peerConnections[userId].onicecandidateerror = (event) => {
      const { url, errorText } = event

      console.warn('[ICE candidate] error', { url, error: errorText })

      if (url.startsWith('host:')) {
        iceNetwork.value.host = false
      }
      if (url.startsWith('stun:')) {
        iceNetwork.value.stun = false
      }
      if (url.startsWith('turn:')) {
        iceNetwork.value.turn = false
      }
    }
  }

  /**
   * onDataChannel 创建 RTC 数据通道
   * @param {string} userId socket.id
   */
  async handleRTCDataChannels(userId: number) {
    this.peerConnections[userId].ondatachannel = (event) => {
      console.log(`handleRTCDataChannels ${userId}`, event)
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
    await this.chatServer.createDataChannel(userId)
    await this.fileSharingServer.createDataChannel(userId)
  }

  /**
   * onNegotiationneeded 创建 offer 并应答一个 sessionDescription
   * 当需要通过信令通道进行连接协商时， 将发送一个 negotiationneeded事件
   * @param {string} userId socket.id
   */
  async handleCreateRTCOffer(userId: number) {
    this.peerConnections[userId].onnegotiationneeded = () => {
      console.log(`Creating RTC offer to ${this.allPeers[userId].userName}`)
      this.peerConnections[userId].createOffer().then((localDescription) => {
        console.log('Local offer description is', localDescription)
        this.peerConnections[userId].setLocalDescription(localDescription).then(() => {
          this.sendToServer('relaySDP', {
            userId,
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

  /**
   * 交换 SessionDescription 信息
   * @param {KeyValue} args data
   */
  handleSessionDescription(args: KeyValue) {
    console.log('Remote Session Description', args)
    const { userId, sessionDescription } = args
    const remoteDescription = new RTCSessionDescription(sessionDescription)
    this.peerConnections[userId].setRemoteDescription(remoteDescription).then(() => {
      console.log('setRemoteDescription done!')
      if (sessionDescription.type === 'offer') {
        console.log('Creating answer')
        this.peerConnections[userId].createAnswer().then((localDescription) => {
          console.log('Answer description is: ', localDescription)
          this.peerConnections[userId].setLocalDescription(localDescription).then(() => {
            this.sendToServer('relaySDP', { userId, sessionDescription: localDescription })
            console.log('Answer setLocalDescription done!')
            if (this.needToCreateOffer) {
              this.needToCreateOffer = false
              this.handleCreateRTCOffer(userId)
              console.log('[RTCSessionDescription] - NEED TO CREATE OFFER', { userId })
            }
          }).catch((err) => {
            console.error('[Error] answer setLocalDescription', err)
          })
        }).catch((err) => {
          console.error('[Error] creating answer', err)
        })
      }
    }).catch((err) => {
      console.error('[Error] setRemoteDescription', err)
    })
  }

  /**
   * 添加一个 IceCandidate
   * offer 与 answer 以此传输 Blob 数据流
   * @param {KeyValue} args data
   */
  handleIceCandidate(args: KeyValue) {
    const { userId, iceCandidate } = args
    this.peerConnections[userId].addIceCandidate(new RTCIceCandidate(iceCandidate)).catch((err) => {
      console.error('[Error] addIceCandidate', err)
    })
  }

  /**
   * UI 设置用户名 avatar
   * @param {KeyValue} args data
   */
  handleuserName(args: KeyValue) {
    const { userId, userName } = args
    console.log(userId, userName)
  }

  /**
   * UI 更新状态
   * @param {KeyValue} args data
   */
  handlePeerStatus(args: KeyValue) {
    const { userId, action, status } = args

    switch (action) {
      case 'video':
        this.mediaServer.setPeerStatus('videoStatus', userId, status)
        break
      case 'audio':
        this.mediaServer.setPeerStatus('audioStatus', userId, status)
        break
      case 'hand':
        this.mediaServer.setPeerStatus('handStatus', userId, status)
        break
      case 'privacy':
        this.mediaServer.setPeerStatus('privacyStatus', userId, status)
        break
      default:
        break
    }
  }

  /**
   * Handle received peer actions
   * @param {KeyValue} args data
   */
  handlePeerAction(args: KeyValue) {
    console.log('Handle peer action: ', args)
    const { userId, userName, peerVideo, peerAction } = args
    console.log({ userId, userName, peerVideo, peerAction })
    switch (peerAction) {
      case 'muteAudio':
        this.mediaServer.setLocalAudioOff()
        break
      case 'hideVideo':
        this.mediaServer.setLocalVideoOff()
        break
      case 'recStart':
        this.notifyRecording(userId, userName, 'Start')
        break
      case 'recStop':
        this.notifyRecording(userId, userName, 'Stop')
        break
      case 'screenStart':
        // handleScreenStart(userId)
        break
      case 'screenStop':
        // handleScreenStop(userId, peerVideo)
        break
      case 'ejectAll':
        // 踢出所有人
        // handleKickedOut(args)
        break
      default:
        break
    }
  }

  /**
   * UI 悬浮信息
   * @param {KeyValue} args data
   */
  handleMessage(args: KeyValue) {
    console.log('Got message', args)

    switch (args.type) {
      case 'roomEmoji':
        this.handleEmoji(args)
        break
      default:
        break
    }
  }

  /**
   * UI 悬浮表情信息
   * @param {KeyValue} args data
   */
  handleEmoji(args: KeyValue, duration: number = 5000) {
    console.log({ args, duration })
  }

  // 认证失败
  handleUnauthorized() {
    playSound('alert')
    router.push({ name: 'start' })
  }

  handleUnlockTheRoom() {
    playSound('alert')
    const args = {
      roomId: local.value.roomId,
      userName: local.value.userName,
      action: 'checkPassword',
      password: '',
    }
    this.sendToServer('roomAction', args)
  }

  /**
   * 房间操作
   * @param {KeyValue} args data
   * @param {boolean} emit 是否通知其它用户
   */
  handleRoomAction(args: KeyValue, emit: boolean = false) {
    const { action } = args
    if (emit) {
      const data = {
        action,
        roomId: local.value.roomId,
        userId: local.value.userId,
        userName: local.value.userName,
        password: '',
      }
      switch (action) {
        case 'lock':
          playSound('newMessage')
          data.password = '' // TODO
          this.sendToServer('roomAction', data)
          this.handleRoomStatus(data)

          break
        case 'unlock':
          this.sendToServer('roomAction', data)
          this.handleRoomStatus(data)
          break
        default:
          break
      }
    } else {
      this.handleRoomStatus(args)
    }
  }

  /**
   * 设置房间锁定状态
   * @param {KeyValue} args data
   */
  handleRoomStatus(args: KeyValue) {
    const { action, userName, password } = args
    switch (action) {
      case 'lock':
        playSound('locked')
        console.log('toast', `${userName} \n has 🔒 LOCKED the room by password`)
        this.isRoomLocked = true
        break
      case 'unlock':
        console.log('toast', `${userName} \n has 🔓 UNLOCKED the room`)
        this.isRoomLocked = false
        break
      case 'checkPassword':
        this.isRoomLocked = true
        password === 'OK' ? this.login() : this.handleRoomLocked()
        break
      default:
        break
    }
  }

  /**
   * 退出房间 跳到开始页
   */
  handleRoomLocked() {
    playSound('eject')
    console.log('Room is Locked, try with another one')
    // TODO 退出房间 跳到开始页
  }

  /**
   * 信令服务器信息
   * @param {KeyValue} args data
   */
  handleServerInfo(args: KeyValue) {
    console.log('13. Server info', args)

    const { peersCount, hostProtected, userAuth, isOwner } = args

    this.isHostProtected = hostProtected
    this.isPeerAuthEnabled = userAuth

    if (this.userLimits.active && peersCount > this.userLimits.count) {
      return this.roomIsBusy()
    }

    this.isOwner = this.isPeerReconnected ? this.isOwner : isOwner

    if (this.isRulesActive) {
      // TODO UI 权限
    }

    this.shareRoomMeetingURL()
  }

  /**
   * 房间正忙 断开连接并提醒用户
   * 重定向到首页
   */
  roomIsBusy() {
    this.socket.close()
    playSound('alert')
    // openURL('/')
  }

  // 分享房间
  shareRoomMeetingURL() {
    playSound('newMessage')
    //
  }

  getRoomURL() {
    return ''
  }

  copyRoomURL() {
    const roomURL = this.getRoomURL()
    const tmpInput = document.createElement('input')
    document.body.appendChild(tmpInput)
    tmpInput.value = roomURL
    tmpInput.select()
    tmpInput.setSelectionRange(0, 99999)
    navigator.clipboard.writeText(tmpInput.value)
    console.log('Copied to clipboard Join Link ', roomURL)
    document.body.removeChild(tmpInput)
    console.log('toast', 'Meeting URL copied to clipboard 👍')
  }

  notifyRecording(fromId: string, from: string, action: string) {
    const msg = `🔴 ${action} recording.`
    const chatMessage = { from, fromId, to: local.value.userName, msg, privateMsg: false }
    this.chatServer.onMessage(chatMessage)
  }

  /**
   * Whiteboard: json to canvas objects
   * @param {KeyValue} args data
   */
  handleJsonToWbCanvas(args: KeyValue) {
    console.log(args)
    // if (!wbIsOpen) {
    //   toggleWhiteboard()
    // }

    // wbCanvas.loadFromJSON(config.wbCanvasJson)
    // wbCanvas.renderAll()

    // if (!isOwner && !wbCanvas.isDrawingMode && wbIsLock) {
    //   wbDrawing(false)
    // }
  }

  handleWhiteboardAction(args: KeyValue, logMe: boolean = true) {
    const { userName, action, color } = args
    console.log({ userName, action, color, logMe })

    // if (logMe) {
    //   userLog('toast', `${icons.user} ${peer_name} \n whiteboard action: ${action}`)
    // }
    // switch (action) {
    //   case 'bgcolor':
    //     wbCanvasBackgroundColor(color)
    //     break
    //   case 'undo':
    //     wbCanvasUndo()
    //     break
    //   case 'redo':
    //     wbCanvasRedo()
    //     break
    //   case 'clear':
    //     wbCanvas.clear()
    //     break
    //   case 'toggle':
    //     toggleWhiteboard()
    //     break
    //   case 'lock':
    //     if (!isOwner) {
    //       elemDisplay(whiteboardTitle, false)
    //       elemDisplay(whiteboardOptions, false)
    //       elemDisplay(whiteboardBtn, false)
    //       wbDrawing(false)
    //       wbIsLock = true
    //     }
    //     break
    //   case 'unlock':
    //     if (!isOwner) {
    //       elemDisplay(whiteboardTitle, true, 'flex')
    //       elemDisplay(whiteboardOptions, true, 'inline')
    //       elemDisplay(whiteboardBtn, true)
    //       wbDrawing(true)
    //       wbIsLock = false
    //     }
    //     break
    //     // ...
    //   default:
    //     break
    // }
  }

  handleKickedOut(args: KeyValue) {
    console.log(args)
  }

  handleFileInfo(args: KeyValue) {
    console.log(args)
  }

  handleFileAbort() {
  }

  handleVideoPlayer(args: KeyValue) {
    console.log(args)
  }

  emitPeerAction(userId: number, action: string) {
    if (!this.peerCount) {
      return
    }

    this.sendToServer('peerAction', {
      action,
      userId,
      roomId: local.value.roomId,
      roomName: '',

      useVideo: local.value.useVideo,
      sendToAll: false,
    })
  }

  sendToServer(type: string, args = {}) {
    this.socket.send(type, args)
  }
}

export function useWebRTCClient() {
  return new Client()
}
