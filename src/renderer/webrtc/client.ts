import { storeToRefs } from 'pinia'
import { ChatServer, FileServer, MediaServer, WebSocketServer, WhiteboardServer } from '.'
import { playSound } from '@/utils'
import { useWebrtcStore } from '@/store'

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
  declare static socket: WebSocketServer
  static allPeers: KeyValue = {}
  static peerConnections: { [key: string]: RTCPeerConnection } = {}
  static needToCreateOffer: boolean = false

  static isRoomLocked: boolean = false
  static isHostProtected: boolean = false
  static isPeerAuthEnabled: boolean = false
  static isPeerReconnected: boolean = false
  static isOwner: boolean = false // 是否主持人
  static isRulesActive = true // 是否主持人可以做任何事情 false 所有人平等
  static userLimits: KeyValue = {
    // 是否限制每个房间的用户数
    active: false,
    // 限制数量
    count: 2,
  }

  // peer 连接数
  static peerCount() {
    return Object.keys(Client.peerConnections).length
  }

  static start() {
    console.log('01. 连接到信令服务器')
    Client.socket = new WebSocketServer(import.meta.env.RENDERER_VITE_WEBRTC_URL)
    Client.socket.onOpen(Client.handleConnect)
    Client.socket.onMessage(Client.onMessage)
    Client.socket.onClose(Client.handleDisconnect)
  }

  static onMessage(cmd: string, args: KeyValue) {
    switch (cmd) {
      case 'createRTCPeerConnection':
        Client.createRTCPeerConnection(args)
        break
      case 'unauthorized':
        Client.handleUnauthorized()
        break
      case 'roomIsLocked':
        Client.handleUnlockTheRoom()
        break
      case 'roomAction':
        Client.handleRoomAction(args)
        break
      case 'serverInfo':
        Client.handleServerInfo(args)
        break
      case 'sessionDescription':
        Client.handleSessionDescription(args)
        break
      case 'iceCandidate':
        Client.handleIceCandidate(args)
        break
      case 'userName':
        Client.handleuserName(args)
        break
      case 'peerStatus':
        Client.handlePeerStatus(args)
        break
      case 'peerAction':
        Client.handlePeerAction(args)
        break
      case 'message':
        Client.handleMessage(args)
        break
      case 'wbCanvasToJson':
        Client.handleJsonToWbCanvas(args)
        break
      case 'whiteboardAction':
        Client.handleWhiteboardAction(args)
        break
      case 'kickOut':
        Client.handleKickedOut(args)
        break
      case 'fileInfo':
        Client.handleFileInfo(args)
        break
      case 'fileAbort':
        Client.handleFileAbort()
        break
      case 'videoPlayer':
        Client.handleVideoPlayer(args)
        break
      case 'disconnect':
        Client.handleDisconnect(args)
        break
      case 'exit':
        Client.handleRemovePeer(args)
        break
      default:
        break
    }
  }

  // 连接成功
  static async handleConnect() {
    console.log('03. 信令服务器连接成功')
    Client.login()
  }

  // 进入房间
  static async login() {
    console.log('12. join to room', local.value.roomId)
    Client.sendToServer('login', {
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

  static handleDisconnect(args: KeyValue) {
    console.log('Disconnected from signaling server', { args })

    // 录音相关的UI
    // checkRecording()

    remotePeers.value = {}

    for (const userId in Client.peerConnections) {
      Client.peerConnections[userId].close()
    }

    ChatServer.cleanDataChannel()
    FileServer.cleanDataChannel()
    Client.peerConnections = {}

    Client.isPeerReconnected = true
  }

  static handleRemovePeer(args: KeyValue) {
    console.log('Signaling server said to remove peer:', args)

    const { userId } = args

    if (userId in Client.peerConnections) {
      Client.peerConnections[userId].close()
    }

    delete Client.allPeers[userId]
    delete Client.peerConnections[userId]
    delete remotePeers.value[userId]

    ChatServer.removeDataChannel(userId)
    FileServer.removeDataChannel(userId)

    playSound('removePeer')
    console.log('ALL PEERS', Client.allPeers)
  }

  /**
   * 当加入一个房间后，收到信令服务器发送的 createRTCPeerConnection 事件
   * @param {object} args data
   */
  static async createRTCPeerConnection(args: KeyValue) {
    const { userId, shouldCreateOffer, iceServers, peers } = args
    const { userName, useVideo } = peers[userId]

    if (userId in Client.peerConnections) {
      return console.log('Already connected to peer', userId)
    }

    console.log('iceServers', iceServers.map((serv: KeyValue) => serv.urls))

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
    const peerConnection = new RTCPeerConnection({ iceServers })
    Client.peerConnections[userId] = peerConnection
    Client.allPeers = peers

    console.log('[RTCPeerConnection] - userId', userId)
    console.log('[RTCPeerConnection] - PEER-CONNECTIONS', Client.peerConnections)
    console.log('[RTCPeerConnection] - PEERS', peers)

    // 谁与我连接
    const connectedPeersName: string[] = []
    for (const id in Client.peerConnections) {
      connectedPeersName.push(peers[id].userName)
    }
    console.log('[RTCPeerConnection] - CONNECTED TO PEERS', JSON.stringify(connectedPeersName))

    // TODO 在聊天室列表中添加参与者 peers
    await Client.logConnectionStatus(userId)
    await Client.handleOnIceCandidate(userId)
    await Client.handleRTCDataChannels(userId)
    await MediaServer.handleOnTrack(userId, peers)
    await MediaServer.handleAddTracks(userId)

    if (!useVideo && !Client.needToCreateOffer) {
      Client.needToCreateOffer = true
    }
    if (shouldCreateOffer) {
      await Client.handleCreateRTCOffer(userId)
      console.log('[RTCPeerConnection] - SHOULD CREATE OFFER', { userId, userName })
    }

    // 如果对方无视频设备
    if (!useVideo) {
      await MediaServer.loadRemoteMediaStream(new MediaStream(), peers, userId, 'video')
    }

    await WhiteboardServer.onUpdate()
    playSound('createPeer')
  }

  /**
   * 打印 RTC 连接状态
   * @param {string} userId socket.id
   */
  static async logConnectionStatus(userId: number) {
    Client.peerConnections[userId].onconnectionstatechange = () => {
      const connectionStatus = Client.peerConnections[userId].connectionState
      const signalingState = Client.peerConnections[userId].signalingState
      const userName = Client.allPeers[userId].userName
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
  static async handleOnIceCandidate(userId: number) {
    Client.peerConnections[userId].onicecandidate = (event) => {
      if (!event.candidate || !event.candidate.candidate) {
        return
      }

      const { type, candidate, sdpMLineIndex } = event.candidate

      // console.log('[ICE candidate]', event.candidate)

      Client.sendToServer('relayICE', {
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
    Client.peerConnections[userId].onicecandidateerror = (event) => {
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
  static async handleRTCDataChannels(userId: number) {
    Client.peerConnections[userId].ondatachannel = (event) => {
      console.log(`handleRTCDataChannels ${userId}`, event)
      event.channel.onmessage = (msg) => {
        switch (event.channel.label) {
          case 'chat_channel':
            try {
              const dataMessage = JSON.parse(msg.data)
              switch (dataMessage.type) {
                case 'chat':
                  ChatServer.onMessage(dataMessage)
                  break
                case 'speech':
                  ChatServer.onSpeech(dataMessage)
                  break
                case 'micVolume':
                  ChatServer.onVolume(dataMessage)
                  break
                default:
                  break
              }
            } catch (err) {
              console.error('chat_channel', err)
            }
            break
          case 'file_sharing_channel':
            FileServer.onMessage(msg.data)
            break
          default:
            break
        }
      }
    }
    await ChatServer.createDataChannel(userId)
    await FileServer.createDataChannel(userId)
  }

  /**
   * onNegotiationneeded 创建 offer 并应答一个 sessionDescription
   * 当需要通过信令通道进行连接协商时， 将发送一个 negotiationneeded事件
   * @param {string} userId socket.id
   */
  static async handleCreateRTCOffer(userId: number) {
    Client.peerConnections[userId].onnegotiationneeded = () => {
      console.log(`Creating RTC offer to ${Client.allPeers[userId].userName}`)
      Client.peerConnections[userId].createOffer().then((localDescription) => {
        console.log('Local offer description is', localDescription)
        Client.peerConnections[userId].setLocalDescription(localDescription).then(() => {
          Client.sendToServer('relaySDP', {
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
  static handleSessionDescription(args: KeyValue) {
    console.log('Remote Session Description', args)
    const { userId, sessionDescription } = args
    const remoteDescription = new RTCSessionDescription(sessionDescription)
    Client.peerConnections[userId].setRemoteDescription(remoteDescription).then(() => {
      console.log('setRemoteDescription done!')
      if (sessionDescription.type === 'offer') {
        console.log('Creating answer')
        Client.peerConnections[userId].createAnswer().then((localDescription) => {
          console.log('Answer description is: ', localDescription)
          Client.peerConnections[userId].setLocalDescription(localDescription).then(() => {
            Client.sendToServer('relaySDP', { userId, sessionDescription: localDescription })
            console.log('Answer setLocalDescription done!')
            if (Client.needToCreateOffer) {
              Client.needToCreateOffer = false
              Client.handleCreateRTCOffer(userId)
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
  static handleIceCandidate(args: KeyValue) {
    const { userId, iceCandidate } = args
    Client.peerConnections[userId].addIceCandidate(new RTCIceCandidate(iceCandidate)).catch((err) => {
      console.error('[Error] addIceCandidate', err)
    })
  }

  /**
   * UI 设置用户名 avatar
   * @param {KeyValue} args data
   */
  static handleuserName(args: KeyValue) {
    const { userId, userName } = args
    console.log(userId, userName)
  }

  /**
   * UI 更新状态
   * @param {KeyValue} args data
   */
  static handlePeerStatus(args: KeyValue) {
    const { userId, action, status } = args

    switch (action) {
      case 'video':
        MediaServer.setPeerStatus('videoStatus', userId, status)
        break
      case 'audio':
        MediaServer.setPeerStatus('audioStatus', userId, status)
        break
      case 'hand':
        MediaServer.setPeerStatus('handStatus', userId, status)
        break
      case 'privacy':
        MediaServer.setPeerStatus('privacyStatus', userId, status)
        break
      default:
        break
    }
  }

  /**
   * Handle received peer actions
   * @param {KeyValue} args data
   */
  static handlePeerAction(args: KeyValue) {
    console.log('Handle peer action: ', args)
    const { userId, userName, peerVideo, peerAction } = args
    console.log({ userId, userName, peerVideo, peerAction })
    switch (peerAction) {
      case 'muteAudio':
        MediaServer.setLocalAudioOff()
        break
      case 'hideVideo':
        MediaServer.setLocalVideoOff()
        break
      case 'recStart':
        Client.notifyRecording(userId, userName, 'Start')
        break
      case 'recStop':
        Client.notifyRecording(userId, userName, 'Stop')
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
  static handleMessage(args: KeyValue) {
    console.log('Got message', args)

    switch (args.type) {
      case 'roomEmoji':
        Client.handleEmoji(args)
        break
      default:
        break
    }
  }

  /**
   * UI 悬浮表情信息
   * @param {KeyValue} args data
   */
  static handleEmoji(args: KeyValue, duration: number = 5000) {
    console.log({ args, duration })
  }

  // 认证失败
  static handleUnauthorized() {
    playSound('alert')
    // Client.router.push({ name: 'start' })
  }

  static handleUnlockTheRoom() {
    playSound('alert')
    const args = {
      roomId: local.value.roomId,
      userName: local.value.userName,
      action: 'checkPassword',
      password: '',
    }
    Client.sendToServer('roomAction', args)
  }

  /**
   * 房间操作
   * @param {KeyValue} args data
   * @param {boolean} emit 是否通知其它用户
   */
  static handleRoomAction(args: KeyValue, emit: boolean = false) {
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
          Client.sendToServer('roomAction', data)
          Client.handleRoomStatus(data)

          break
        case 'unlock':
          Client.sendToServer('roomAction', data)
          Client.handleRoomStatus(data)
          break
        default:
          break
      }
    } else {
      Client.handleRoomStatus(args)
    }
  }

  /**
   * 设置房间锁定状态
   * @param {KeyValue} args data
   */
  static handleRoomStatus(args: KeyValue) {
    const { action, userName, password } = args
    switch (action) {
      case 'lock':
        playSound('locked')
        console.log('toast', `${userName} \n has 🔒 LOCKED the room by password`)
        Client.isRoomLocked = true
        break
      case 'unlock':
        console.log('toast', `${userName} \n has 🔓 UNLOCKED the room`)
        Client.isRoomLocked = false
        break
      case 'checkPassword':
        Client.isRoomLocked = true
        password === 'OK' ? Client.login() : Client.handleRoomLocked()
        break
      default:
        break
    }
  }

  /**
   * 退出房间 跳到开始页
   */
  static handleRoomLocked() {
    playSound('eject')
    console.log('Room is Locked, try with another one')
    // TODO 退出房间 跳到开始页
  }

  /**
   * 信令服务器信息
   * @param {KeyValue} args data
   */
  static handleServerInfo(args: KeyValue) {
    console.log('13. Server info', args)

    const { peersCount, hostProtected, userAuth, isOwner } = args

    Client.isHostProtected = hostProtected
    Client.isPeerAuthEnabled = userAuth

    if (Client.userLimits.active && peersCount > Client.userLimits.count) {
      return Client.roomIsBusy()
    }

    Client.isOwner = Client.isPeerReconnected ? Client.isOwner : isOwner

    if (Client.isRulesActive) {
      // TODO UI 权限
    }

    Client.shareRoomMeetingURL()
  }

  /**
   * 房间正忙 断开连接并提醒用户
   * 重定向到首页
   */
  static roomIsBusy() {
    Client.socket.close()
    playSound('alert')
    // openURL('/')
  }

  // 分享房间
  static shareRoomMeetingURL() {
    playSound('newMessage')
    //
  }

  static getRoomURL() {
    return ''
  }

  static copyRoomURL() {
    const roomURL = Client.getRoomURL()
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

  static notifyRecording(fromId: string, from: string, action: string) {
    const msg = `🔴 ${action} recording.`
    const chatMessage = { from, fromId, to: local.value.userName, msg, privateMsg: false }
    ChatServer.onMessage(chatMessage)
  }

  /**
   * Whiteboard: json to canvas objects
   * @param {KeyValue} args data
   */
  static handleJsonToWbCanvas(args: KeyValue) {
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

  static handleWhiteboardAction(args: KeyValue, logMe: boolean = true) {
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

  static handleKickedOut(args: KeyValue) {
    console.log(args)
  }

  static handleFileInfo(args: KeyValue) {
    console.log(args)
  }

  static handleFileAbort() {
  }

  static handleVideoPlayer(args: KeyValue) {
    console.log(args)
  }

  static emitPeerAction(userId: number, action: string) {
    if (!Client.peerCount()) {
      return
    }

    Client.sendToServer('peerAction', {
      action,
      userId,
      roomId: local.value.roomId,
      roomName: '',

      useVideo: local.value.useVideo,
      sendToAll: false,
    })
  }

  static sendToServer(type: string, args = {}) {
    Client.socket.send(type, args)
  }
}

export function useWebRTCClient() {
  return new Client()
}
