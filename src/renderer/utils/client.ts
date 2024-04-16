import { type Socket, io } from 'socket.io-client'
import { storeToRefs } from 'pinia'
import { FilterXSS } from 'xss'
import CryptoJS from 'crypto-js'
import { fabric } from 'fabric'
import { hasAudioTrack, hasVideoTrack, playSound } from './media'
import { adaptAspectRatio, setSP } from './videoGrid'
import { useWebrtcStore } from '@/store'

const filterXSS = new FilterXSS().process
const webrtcStore = useWebrtcStore()
const { useScreen, useVideo, useAudio } = storeToRefs(webrtcStore)

export class Client {
  declare roomId: string
  declare peerId: string
  declare peerName: string
  declare peerUuid: string
  declare isPresenter: string

  declare socket: Socket

  declare localVideoStream: MediaStream
  declare localAudioStream: MediaStream

  declare videoInputDevices: MediaDeviceInfo[]
  declare audioInputDevices: MediaDeviceInfo[]
  declare audioOutputDevices: MediaDeviceInfo[]

  declare videoElement: HTMLVideoElement
  declare audioElement: HTMLAudioElement
  declare volumeElement: HTMLDivElement
  declare remoteAvatarImage: HTMLImageElement
  declare remoteVideoElement: HTMLVideoElement
  declare remoteAudioElement: HTMLAudioElement
  declare peersCount: HTMLDivElement

  allPeers: any
  isRoomLocked: boolean = false
  peerConnections: { [key: string]: RTCPeerConnection } = {}

  isMobileDevice: boolean = false
  needToCreateOffer: boolean = false

  // chat
  isChatRoomVisible: boolean = false
  isCaptionBoxVisible: boolean = false
  showChatOnMessage: boolean = true
  speechInMessages: boolean = false

  chatDataChannels: { [key: string]: RTCDataChannel } = {}
  fileDataChannels: { [key: string]: RTCDataChannel } = {}

  // 白板
  wbPop: fabric.Object[] = []
  wbIsOpen: boolean = false
  wbIsLock: boolean = false
  wbIsRedoing: boolean = false
  wbCanvas: fabric.Canvas = new fabric.Canvas('wbCanvas')

  constructor(videoElement: HTMLVideoElement, audioElement: HTMLAudioElement, volumeElement: HTMLDivElement) {
    this.videoElement = videoElement
    this.audioElement = audioElement
    this.volumeElement = volumeElement

    console.log('01. 连接到信令服务器')
  }

  // peer 连接数
  get peerConnectCount() {
    return Object.keys(this.peerConnections).length
  }

  start() {
    this.socket = io('ws://localhost:8081', {
      path: '/webrtc/p2p',
      transports: ['websocket'],
    })

    const transport = this.socket.io.engine.transport.name
    console.log('02. Connection transport', transport)

    this.socket.on('connect', this.handleConnect.bind(this))
    this.socket.on('unauthorized', this.handleUnauthorized.bind(this))
    this.socket.on('roomIsLocked', this.handleUnlockTheRoom.bind(this))
    this.socket.on('roomAction', this.handleRoomAction.bind(this))
    this.socket.on('addPeer', this.handleAddPeer.bind(this))
  }

  async handleConnect() {
    console.log('03. 信令服务器连接成功')
    const { localVideoStream, localAudioStream } = this

    this.peerId = this.socket.id!

    console.log(`04. PeerId [ ${this.peerId} ]`)

    if (localVideoStream && localAudioStream) {
      await this.joinToChannel()
    } else {
      await this.initEnumerateDevices()
      await this.setupLocalVideoMedia()
      await this.setupLocalAudioMedia()
      if (!toValue(useVideo) || (!toValue(useVideo) && !toValue(useAudio))) {
        await this.loadLocalMedia(new MediaStream(), 'video')
      }
    }
  }

  // 认证失败
  handleUnauthorized() {
    playSound('alert')
    ElMessage.error({
      grouping: true,
      message: '认证过期或失败',
    })
    // TODO 跳到登录页
  }

  /**
   * 尝试通过提供有效密码解锁房间
   */
  handleUnlockTheRoom() {
    playSound('alert')
    this.sendToServer('roomAction', {
      action: 'checkPassword',
      roomId: this.roomId,
      peerName: '',
      password: '',
    })
  }

  /**
   * 房间已锁定
   */
  handleRoomLocked() {
    playSound('eject')
    console.log('房间已锁定，请尝试另一个')
    // TODO
  }

  /**
   * 房间行为
   * @param {KeyValue} args data
   * @param {boolean} emit 是否告知信令服务器
   */
  handleRoomAction(args: KeyValue, emit: boolean = false) {
    const { action } = args
    if (emit) {
      const { roomId, peerId, peerName, peerUuid } = this
      const data = {
        action,
        roomId,
        peerId,
        peerName,
        peerUuid,
        password: null,
      }
      switch (action) {
        case 'lock':
          playSound('newMessage')
          this.sendToServer('roomAction', data)
          break
        case 'unlock':
          this.sendToServer('roomAction', data)
          this.handleRoomStatus(data)
          break
        default:
          break
      }
    } else {
      // 来自信令服务器的数据
      this.handleRoomStatus(args)
    }
  }

  /**
   * 房间状态
   * @param {KeyValue} args data
   */
  handleRoomStatus(args: KeyValue) {
    const { action, peerName, password } = args

    switch (action) {
      case 'lock':
        playSound('locked')
        console.log('toast', `${peerName} \n has 🔒 LOCKED the room by password`, 'top-end')
        this.isRoomLocked = true
        break
      case 'unlock':
        console.log('toast', `${peerName} \n has 🔓 UNLOCKED the room`, 'top-end')
        this.isRoomLocked = false
        break
      case 'checkPassword':
        this.isRoomLocked = true
        password === 'OK' ? this.joinToChannel() : this.handleRoomLocked()
        break
      default:
        break
    }
  }

  /**
   * RTC 连接状态
   * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/connectionstatechange_event
   * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/connectionState
   * @param {string} peerId socket.id
   */
  async handlePeersConnectionStatus(peerId: string) {
    this.peerConnections[peerId].onconnectionstatechange = () => {
      const connectionStatus = this.peerConnections[peerId].connectionState
      const signalingState = this.peerConnections[peerId].signalingState
      const peerName = this.allPeers[peerId].peerName
      console.log('[RTCPeerConnection] - CONNECTION', {
        peerId,
        peerName,
        connectionStatus,
        signalingState,
      })
    }
  }

  /**
   * 当加入一个房间时，信令服务器会向房间中的每一对用户发送 addPeer 事件
   * @param {object} args data
   */
  async handleAddPeer(args: KeyValue) {
    const { peerId, shouldCreateOffer, iceServers, peers } = args
    const { peerName, peerVideo } = peers[peerId]

    if (peerId in this.peerConnections) {
      return console.log('Already connected to peer', peerId)
    }

    console.log('iceServers', iceServers[0])

    const peerConnection = new RTCPeerConnection({ iceServers })
    this.peerConnections[peerId] = peerConnection

    this.allPeers = peers

    console.log('[RTCPeerConnection] - peerId', peerId)
    console.log('[RTCPeerConnection] - PEER-CONNECTIONS', this.peerConnections)
    console.log('[RTCPeerConnection] - PEERS', peers)

    // As P2P check who I am connected with
    const connectedPeersName: string[] = []
    for (const id in this.peerConnections) {
      connectedPeersName.push(peers[id].peerName)
    }
    console.log('[RTCPeerConnection] - CONNECTED TO PEERS', JSON.stringify(connectedPeersName))

    // TODO 在聊天室列表中添加参与者 peers
    await this.handlePeersConnectionStatus(peerId)
    await this.handleOnIceCandidate(peerId)
    await this.handleRTCDataChannels(peerId)
    await this.handleOnTrack(peerId, peers)
    await this.handleAddTracks(peerId)

    if (!peerVideo && !this.needToCreateOffer) {
      this.needToCreateOffer = true
    }
    if (shouldCreateOffer) {
      await this.handleRtcOffer(peerId)
      console.log('[RTCPeerConnection] - SHOULD CREATE OFFER', { peerId, peerName })
    }

    if (!peerVideo) {
      await this.loadRemoteMediaStream(new MediaStream(), peers, peerId, 'video')
    }

    await this.wbUpdate()
    playSound('addPeer')
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/ontrack
   * @param {string} peerId socket.id
   * @param {KeyValue} peers all peers info connected to the same room
   */
  async handleOnTrack(peerId: string, peers: KeyValue) {
    console.log('[ON TRACK] - peerId', { peerId })

    this.peerConnections[peerId].ontrack = (event) => {
      const { remoteVideoElement, remoteAudioElement } = this
      // remoteAvatarImage

      const peerInfo = peers[peerId]
      const { peerName } = peerInfo
      const { kind } = event.track

      console.log('[ON TRACK] - info', { peerId, peerName, kind })

      if (event.streams && event.streams[0]) {
        console.log('[ON TRACK] - peers', peers)

        switch (kind) {
          case 'video':
            remoteVideoElement
              ? this.attachMediaStream(remoteVideoElement, event.streams[0])
              : this.loadRemoteMediaStream(event.streams[0], peers, peerId, kind)
            break
          case 'audio':
            remoteAudioElement
              ? this.attachMediaStream(remoteAudioElement, event.streams[0])
              : this.loadRemoteMediaStream(event.streams[0], peers, peerId, kind)
            break
          default:
            break
        }
      } else {
        console.log('[ON TRACK] - SCREEN SHARING', { peerId, peerName, kind })
        const inboundStream = new MediaStream([event.track])
        this.attachMediaStream(remoteVideoElement, inboundStream)
      }
    }
  }

  /**
   * 白板
   */
  async wbUpdate() {
    if (this.wbIsOpen && this.peerConnectCount > 0) {
      this.wbCanvasToJson()
      this.whiteboardAction(this.getWhiteboardAction(this.wbIsLock ? 'lock' : 'unlock'))
    }
  }

  getWhiteboardAction(action) {
    return {
      roomId: this.roomId,
      peerName: this.peerName,
      action,
    }
  }

  whiteboardAction(config) {
    if (this.peerConnectCount > 0) {
      this.sendToServer('whiteboardAction', config)
    }
    this.handleWhiteboardAction(config, false)
  }

  wbCanvasBackgroundColor(color) {
    setSP('--wb-bg', color)
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
        if (!this.isPresenter) {
          this.wbDrawing(false)
          this.wbIsLock = true
        }
        break
      case 'unlock':
        if (!this.isPresenter) {
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
    if (!this.isPresenter && this.wbIsLock) {
      return
    }
    if (this.peerConnectCount > 0) {
      const config = {
        roomId: this.roomId,
        wbCanvasJson: JSON.stringify(this.wbCanvas?.toJSON()),
      }
      this.sendToServer('wbCanvasToJson', config)
    }
  }

  /**
   * 只有对等连接的一侧应该创建要约，信令服务器选择其中一方作为要约人。
   * 另一个用户将获得一个 sessionDescription 事件并创建一个报价，然后向我们发回一个答案 sessionDescription
   * @param {string} peerId socket.id
   */
  async handleRtcOffer(peerId: string) {
    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/onnegotiationneeded
    this.peerConnections[peerId].onnegotiationneeded = () => {
      console.log(`Creating RTC offer to ${this.allPeers[peerId].peerName}`)
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer
      this.peerConnections[peerId]
        .createOffer()
        .then((localDescription) => {
          console.log('Local offer description is', localDescription)
          // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setLocalDescription
          this.peerConnections[peerId]
            .setLocalDescription(localDescription)
            .then(() => {
              this.sendToServer('relaySDP', {
                peerId,
                sessionDescription: localDescription,
              })
              console.log('Offer setLocalDescription done!')
            })
            .catch((err) => {
              console.error('[Error] offer setLocalDescription', err)
              console.log('error', `Offer setLocalDescription failed ${err}`)
            })
        })
        .catch((err) => {
          console.error('[Error] sending offer', err)
        })
    }
  }

  /**
   * Add my localVideoMediaStream and localAudioMediaStream Tracks to connected peer
   * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addTrack
   * @param {string} peerId socket.id
   */
  async handleAddTracks(peerId: string) {
    const peerName = this.allPeers[peerId].peerName

    const videoTrack = this.localVideoStream && this.localVideoStream.getVideoTracks()[0]
    const audioTrack = this.localAudioStream && this.localAudioStream.getAudioTracks()[0]

    console.log('handleAddTracks', {
      videoTrack,
      audioTrack,
    })

    if (videoTrack) {
      console.log(`[ADD VIDEO TRACK] to Peer Name [${peerName}]`)
      await this.peerConnections[peerId].addTrack(videoTrack, this.localVideoStream)
    }

    if (audioTrack) {
      console.log(`[ADD AUDIO TRACK] to Peer Name [${peerName}]`)
      await this.peerConnections[peerId].addTrack(audioTrack, this.localAudioStream)
    }
  }

  /**
   * Load Remote Media Stream obj
   * @param {MediaStream} stream media stream audio - video
   * @param {object} peers all peers info connected to the same room
   * @param {string} peerId socket.id
   */
  async loadRemoteMediaStream(stream, peers, peerId, kind) {
    console.log('REMOTE PEER INFO', peers[peerId])

    const peerName = peers[peerId].peerName
    // const peerAudio = peers[peerId].peerAudio
    // const peerVideo = peers[peerId].peerVideo
    // const peerVideoStatus = peers[peerId].peerVideoStatus
    // const peerAudioStatus = peers[peerId].peerAudioStatus
    // const peerScreenStatus = peers[peerId].peerScreenStatus
    // const peerHandStatus = peers[peerId].peerHandStatus
    // const peerRecStatus = peers[peerId].peerRecStatus
    // const peerPrivacyStatus = peers[peerId].peerPrivacyStatus

    if (stream) {
      console.log(`LOAD REMOTE MEDIA STREAM TRACKS - PeerName:[${peerName}]`, stream.getTracks())
    }

    if (kind === 'video') {
      console.log('SETUP REMOTE VIDEO STREAM')
      this.attachMediaStream(this.remoteVideoElement, stream)
      // resize video elements
      adaptAspectRatio()
    } else if (kind === 'audio') {
      console.log('SETUP REMOTE AUDIO STREAM')

      this.attachMediaStream(this.remoteAudioElement, stream)
    }
  }

  /**
   * 处理 ICE 候选人
   * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/onicecandidate
   * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icecandidateerror_event
   * @param {string} peerId socket.id
   */
  async handleOnIceCandidate(peerId: string) {
    this.peerConnections[peerId].onicecandidate = (event) => {
      if (!event.candidate || !event.candidate.candidate) {
        return
      }

      const { type, candidate, address, sdpMLineIndex } = event.candidate

      this.sendToServer('relayICE', {
        peerId,
        iceCandidate: {
          sdpMLineIndex,
          candidate,
        },
      })

      // Get Ice address
      const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/
      let addressInfo = candidate.match(ipRegex)
      if (!addressInfo && address) {
        addressInfo = [address]
      }

      // IP
      if (addressInfo) {
        // networkIP.innerText = addressInfo
      }

      // Display network information based on candidate type
      switch (type) {
        case 'host':
          // networkHost.innerText = '🟢'
          break
        case 'srflx':
          // networkStun.innerText = '🟢'
          break
        case 'relay':
          // networkTurn.innerText = '🟢'
          break
        default:
          console.warn(`[ICE candidate] unknown type: ${type}`, candidate)
          break
      }
    }

    // handle ICE candidate errors
    this.peerConnections[peerId].onicecandidateerror = (event) => {
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
   * RTC 数据通道
   * https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel
   * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createDataChannel
   * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/ondatachannel
   * https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/onmessage
   * @param {string} peerId socket.id
   */
  async handleRTCDataChannels(peerId: string) {
    this.peerConnections[peerId].ondatachannel = (event) => {
      console.log(`handleRTCDataChannels ${peerId}`, event)
      event.channel.onmessage = (msg) => {
        switch (event.channel.label) {
          case 'chat_channel':
            try {
              const dataMessage = JSON.parse(msg.data)
              switch (dataMessage.type) {
                case 'chat':
                  this.handleDataChannelChat(dataMessage)
                  break
                case 'speech':
                  this.handleDataChannelSpeechTranscript(dataMessage)
                  break
                case 'micVolume':
                  this.handlePeerVolume(dataMessage)
                  break
                default:
                  break
              }
            } catch (err) {
              console.error('chat_channel', err)
            }
            break
          case 'file_sharing_channel':
            try {
              const dataFile = msg.data
              if (dataFile instanceof ArrayBuffer && dataFile.byteLength !== 0) {
                this.handleDataChannelFileSharing(dataFile)
              } else {
                if (dataFile instanceof Blob && dataFile.size !== 0) {
                  this.blobToArrayBuffer(dataFile).then((arrayBuffer) => {
                    this.handleDataChannelFileSharing(arrayBuffer)
                  }).catch((error) => {
                    console.error('file_sharing_channel', error)
                  })
                }
              }
            } catch (err) {
              console.error('file_sharing_channel', err)
            }
            break
          default:
            break
        }
      }
    }
    this.createChatDataChannel(peerId)
    this.createFileSharingDataChannel(peerId)
  }

  createChatDataChannel(peerId) {
    this.chatDataChannels[peerId] = this.peerConnections[peerId].createDataChannel('chat_channel')
    this.chatDataChannels[peerId].onopen = (event) => {
      console.log('chatDataChannels created', event)
    }
  }

  createFileSharingDataChannel(peerId) {
    this.fileDataChannels[peerId] = this.peerConnections[peerId].createDataChannel('file_sharing_channel')
    this.fileDataChannels[peerId].binaryType = 'arraybuffer'
    this.fileDataChannels[peerId].onopen = (event) => {
      console.log('fileDataChannels created', event)
    }
  }

  blobToArrayBuffer(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const arrayBuffer = reader.result
        resolve(arrayBuffer)
      }
      reader.onerror = () => {
        reject(new Error('Error reading Blob as ArrayBuffer'))
      }
      reader.readAsArrayBuffer(blob)
    })
  }

  /**
   * Handle peer audio volume
   * @param {KeyValue} data peer audio
   */
  handlePeerVolume(data: KeyValue) {
    console.log(data)
  }

  /**
   * Zoom in/out video element center or by cursor position
   * @param {string} zoomInBtnId
   * @param {string} zoomOutBtnId
   * @param {string} mediaId
   * @param {string} peerId
   */
  handleVideoZoomInOut(zoomInBtnId, zoomOutBtnId, mediaId, peerId = null) {
    console.log(zoomInBtnId, zoomOutBtnId, mediaId, peerId)
  }

  handleDataChannelFileSharing(data) {
    console.log(data)
  }

  /**
   * 处理聊天消息
   * @param {KeyValue} dataMessage chat messages
   */
  handleDataChannelChat(dataMessage: KeyValue) {
    if (!dataMessage) {
      return
    }

    const msgFrom = filterXSS(dataMessage.from)
    const msgFromId = filterXSS(dataMessage.fromId)
    const msgTo = filterXSS(dataMessage.to)
    const msg = filterXSS(dataMessage.msg)
    const msgPrivate = filterXSS(dataMessage.privateMsg)
    // const msgId = filterXSS(dataMessage.id)

    const fromPeerName = this.allPeers[msgFromId].peerName
    if (fromPeerName !== msgFrom) {
      console.log('Fake message detected', { realFrom: fromPeerName, fakeFrom: msgFrom, msg })
      return
    }

    // private message but not for me return
    if (msgPrivate && msgTo !== this.peerName) {
      return
    }

    console.log('handleDataChannelChat', dataMessage)

    // 给我的聊天信息
    if (!this.isChatRoomVisible && this.showChatOnMessage) {
      //
    }
    // show message from
    if (!this.showChatOnMessage) {
      console.log('toast', `New message from: ${msgFrom}`)
    }

    this.speechInMessages ? this.speechMessage(true, msgFrom, msg) : playSound('chatMessage')
  }

  /**
   * 语音消息
   * https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance
   *
   * @param {boolean} newMsg true/false
   * @param {string} from peerName
   * @param {string} msg message
   */
  speechMessage(newMsg: boolean = true, from: string, msg: string) {
    const speech = new SpeechSynthesisUtterance()
    speech.text = `${newMsg ? 'New' : ''} message from:${from}. The message is:${msg}`
    speech.rate = 0.9
    window.speechSynthesis.speak(speech)
  }

  /**
   * 处理获取的文字记录
   * @param {KeyValue} args data
   */
  handleDataChannelSpeechTranscript(args: KeyValue) {
    this.handleSpeechTranscript(args)
  }

  /**
   * 处理获取的文字记录
   * @param {KeyValue} args data
   */
  handleSpeechTranscript(args: KeyValue) {
    if (!args) {
      return
    }
    console.log('Handle speech transcript', args)

    args.textData = filterXSS(args.textData)
    args.peerName = filterXSS(args.peerName)

    const { peerName, textData } = args

    const timeStamp = this.getFormatDate(new Date())
    const avatarImage = this.isValidEmail(peerName) ? this.genGravatar(peerName) : this.genAvatarSvg(peerName, 32)
    console.log(timeStamp, avatarImage, textData)
    if (!this.isCaptionBoxVisible) {
      // TODO
    }
    playSound('speech')
  }

  /**
   * Format date
   * @param {Date} date
   * @returns {string} date format h:m:s
   */
  getFormatDate(date: Date): string {
    const time = date.toTimeString().split(' ')[0]
    return `${time}`
  }

  /**
   * Get Gravatar from email
   * @param {string} email
   * @param {number} size
   * @returns object image
   */
  genGravatar(email: string, size: number = 0) {
    const hash = md5(email.toLowerCase().trim())
    const gravatarURL = `https://www.gravatar.com/avatar/${hash}${size ? `?s=${size}` : '?s=250'}`
    return gravatarURL
    function md5(input) {
      return CryptoJS.MD5(input).toString()
    }
  }

  /**
   * Create round svg image with first 2 letters of peerName in center
   * Thank you: https://github.com/phpony
   *
   * @param {string} peerName
   * @param {integer} avatarImgSize width and height in px
   */
  genAvatarSvg(peerName: string, avatarImgSize: number) {
    const charCodeRed = peerName.charCodeAt(0)
    const charCodeGreen = peerName.charCodeAt(1) || charCodeRed
    const red = charCodeRed ** 7 % 200
    const green = charCodeGreen ** 7 % 200
    const blue = (red + green) % 200
    const bgColor = `rgb(${red}, ${green}, ${blue})`
    const textColor = '#ffffff'
    const svg = `
  <svg xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  width="${avatarImgSize}px"
  height="${avatarImgSize}px"
  viewBox="0 0 ${avatarImgSize} ${avatarImgSize}"
  version="1.1">
      <circle
          fill="${bgColor}"
          width="${avatarImgSize}"
          height="${avatarImgSize}"
          cx="${avatarImgSize / 2}"
          cy="${avatarImgSize / 2}"
          r="${avatarImgSize / 2}"/>
      <text
          x="50%"
          y="50%"
          style="color:${textColor};
          line-height:1;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Fira Sans, Droid Sans, Helvetica Neue, sans-serif"
          alignment-baseline="middle"
          text-anchor="middle"
          font-size="${Math.round(avatarImgSize * 0.4)}"
          font-weight="normal"
          dy=".1em"
          dominant-baseline="middle"
          fill="${textColor}">${peerName.substring(0, 2).toUpperCase()}
      </text>
  </svg>`
    return `data:image/svg+xml,${svg.replace(/#/g, '%23').replace(/"/g, '\'').replace(/&/g, '&amp;')}`
  }

  /**
   * Check if valid email
   * @param {string} email
   * @returns boolean
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  sendToServer(msg: string, args = {}) {
    this.socket.emit(msg, args)
  }

  async joinToChannel() {
    console.log('12. join to channel', this.roomId)
    this.sendToServer('join', {
      roomId: this.roomId,
    })
  }

  async initEnumerateDevices() {
    console.log('05. init Enumerate Video and Audio Devices')

    const { videoInputs, audioInputs, audioOutputs } = useDevicesList({ requestPermissions: true })

    this.videoInputDevices = toValue(videoInputs)
    this.audioInputDevices = toValue(audioInputs)
    this.audioOutputDevices = toValue(audioOutputs)
  }

  async setupLocalVideoMedia() {
    if (!toValue(useVideo) || this.localVideoStream) {
      return
    }

    console.log('Requesting access to video inputs')

    const videoConstraints = toValue(useVideo) ? await this.getVideoConstraints('default') : false

    /**
     * Update Local Media Stream
     * @param {MediaStream} stream
     */
    const updateLocalVideoMediaStream = async (stream: MediaStream) => {
      if (stream) {
        this.localVideoStream = stream
        await this.loadLocalMedia(stream, 'video')
        console.log('Access granted to video device')
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints })
      await updateLocalVideoMediaStream(stream)
    } catch (err) {
      console.error('Error accessing video device', err)
      console.warn('Fallback to default constraints')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        await updateLocalVideoMediaStream(stream)
      } catch (fallbackErr) {
        console.error('Error accessing video device with default constraints', fallbackErr)
        playSound('alert')
      }
    }
  }

  /**
   * Setup local audio media. Ask the user for permission to use the computer's microphone,
   * and attach it to an <audio> tag if access is granted.
   * https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
   */
  async setupLocalAudioMedia() {
    if (!toValue(useAudio) || this.localAudioStream) {
      return
    }

    console.log('Requesting access to audio inputs')

    const audioConstraints = toValue(useAudio) ? await this.getAudioConstraints() : false

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
      if (stream) {
        await this.loadLocalMedia(stream, 'audio')
        if (toValue(useAudio)) {
          this.localAudioStream = stream
          // await getMicrophoneVolumeIndicator(stream)
          console.log('10. Access granted to audio device')
        }
      }
    } catch (err) {
      console.log('audio', err)
      playSound('alert')
    }
  }

  async stopTracks(stream: MediaStream) {
    stream.getTracks().forEach((track) => {
      track.stop()
    })
  }

  async getVideoConstraints(
    quality:
      | 'default'
      | 'qvgaVideo'
      | 'vgaVideo'
      | 'hdVideo'
      | 'fhdVideo'
      | '2kVideo'
      | '4kVideo' = 'default',
    frameRate: FrameRate = { ideal: 30 },
    forceFps: boolean = false,
  ) {
    let constraints = {}

    switch (quality) {
      case 'default':
        if (forceFps) {
          constraints = {
            width: { ideal: 3840 },
            height: { ideal: 2160 },
            frameRate: { ideal: 60 },
          }
        } else {
          constraints = {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          }
        }
        break
      case 'qvgaVideo':
        constraints = {
          width: { exact: 320 },
          height: { exact: 240 },
          frameRate,
        }
        break
      case 'vgaVideo':
        constraints = {
          width: { exact: 640 },
          height: { exact: 480 },
          frameRate,
        }
        break
      case 'hdVideo':
        constraints = {
          width: { exact: 1280 },
          height: { exact: 720 },
          frameRate,
        }
        break
      case 'fhdVideo':
        constraints = {
          width: { exact: 1920 },
          height: { exact: 1080 },
          frameRate,
        }
        break
      case '2kVideo':
        constraints = {
          width: { exact: 2560 },
          height: { exact: 1440 },
          frameRate,
        }
        break
      case '4kVideo':
        constraints = {
          width: { exact: 3840 },
          height: { exact: 2160 },
          frameRate,
        }
        break
      default:
        break
    }
    console.log('Video constraints', constraints)
    return constraints
  }

  async getAudioConstraints() {
    const constraints = {
      // 自动增益
      autoGainControl: true,
      // 消除回声
      echoCancellation: true,
      // 噪声抑制
      noiseSuppression: true,
      // 采样率 48000 | 44100
      sampleRate: 48000,
      // 采样大小 16 ｜ 32
      sampleSize: 32,
      // 通道数 1(mono = 单声道) ｜ 2(stereo = 立体声)
      channelCount: 2,
      // 延迟 ms min="10" max="1000" value="50" step="10"
      latency: 50,
      // 体积 min="0" max="100" value="100" step="10"
      volume: 100 / 100,
    }
    console.log('Audio constraints', constraints)
    return constraints
  }

  async loadLocalMedia(stream: MediaStream, kind: string) {
    if (stream) {
      console.log('LOAD LOCAL MEDIA STREAM TRACKS', stream.getTracks())
    }

    if (kind === 'video') {
      console.log('SETUP LOCAL VIDEO STREAM')
      this.logStreamSettingsInfo('localVideoMediaStream', stream)
      this.attachMediaStream(this.videoElement, stream)
    } else if (kind === 'audio') {
      console.log('SETUP LOCAL AUDIO STREAM')
      this.logStreamSettingsInfo('localAudioMediaStream', stream)
      this.attachMediaStream(this.audioElement, stream)
    }
  }

  logStreamSettingsInfo(name: string, stream: MediaStream) {
    if ((toValue(useVideo) || toValue(useScreen)) && hasVideoTrack(stream)) {
      console.log(name, {
        video: {
          label: stream.getVideoTracks()[0].label,
          settings: stream.getVideoTracks()[0].getSettings(),
        },
      })
    }
    if (toValue(useAudio) && hasAudioTrack(stream)) {
      console.log(name, {
        audio: {
          label: stream.getAudioTracks()[0].label,
          settings: stream.getAudioTracks()[0].getSettings(),
        },
      })
    }
  }

  attachMediaStream(element: HTMLVideoElement | HTMLAudioElement, stream: MediaStream) {
    if (!element || !stream) {
      return
    }
    element.srcObject = stream
    console.log('Success, media stream attached', stream.getTracks())
  }
}
