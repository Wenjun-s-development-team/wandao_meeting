import type http from 'node:http'
import type https from 'node:https'

import type { ServerOptions, Socket } from 'socket.io'
import { Server } from 'socket.io'
import { bytesToSize, checkXSS, config, decodeToken, fmtError, isAuthPeer, isValidFileName, isValidHttpURL } from '../utils'
import { Logs } from './'

const log = new Logs('WebRTCSocket')

export class SocketServer {
  io: Server
  iceServers: KeyValue[] = []
  /**
   * 存储所有 socket 客户端连接
   *
   * {
   *  socket.id: socket, socket.id: socket
   * }
   * @type {{ [key: string]: Socket }}
   * @memberof SocketServer
   */
  sockets: { [key: string]: Socket } = {}
  /**
   * 按房间分组存储 socket 客户端连接
   * {
   *  roomId:{socket.id: socket, socket.id: socket},
   *  roomId:{socket.id: socket, socket.id: socket},
   * }
   * @type {KeyValue}
   * @memberof SocketServer
   */
  rooms: KeyValue = {}
  /**
   * 按房间分组存储 socket 客户端的 RTCPeerConnection 信息
   * {
   *  roomId:{socket.id: peerinfo, socket.id: peerinfo},
   *  roomId:{socket.id: peerinfo, socket.id: peerinfo},
   * }
   * @type {KeyValue}
   * @memberof SocketServer
   */
  peers: KeyValue = {}
  /**
   * 按房间分组存储 主持人信息
   * {
   *  roomId:{socket.id: presenter, socket.id: presenter},
   *  roomId:{socket.id: presenter, socket.id: presenter},
   * }
   * @type {KeyValue}
   * @memberof SocketServer
   */
  presenters: KeyValue = {}

  constructor(server: http.Server | https.Server, option?: ServerOptions) {
    this.iceServers = this.getIceServers()
    this.io = new Server({
      maxHttpBufferSize: 1e7,
      transports: ['websocket'],
      cors: config.cors,
    }).listen(server, option)

    this.io.sockets.on('connect', (socket) => {
      log.debug(`[${socket.id}] connection accepted`, {
        host: socket.handshake.headers.host?.split(':')[0],
        time: socket.handshake.time,
      })

      this.sockets[socket.id] = socket

      const transport = socket.conn.transport.name
      log.debug(`[${socket.id}] Connection transport`, transport)

      socket.conn.on('upgrade', () => {
        const upgradedTransport = socket.conn.transport.name
        log.debug(`[${socket.id}] Connection upgraded transport`, upgradedTransport)
      })

      socket.on('join', args => this.handleJoin(socket, args))

      socket.on('disconnect', async (reason) => {
        for (const roomId in socket.rooms) {
          await this.removePeerFrom(socket, roomId)
        }
        log.debug(`[${socket.id}] disconnected`, { reason })
        delete this.sockets[socket.id]
      })

      socket.on('data', async (args, cb) => {
        args = checkXSS(args)

        log.debug('Socket Promise', args)
        const { roomId, clientId, peerName, method } = args

        switch (method) {
          case 'checkPeerName':
            log.debug('Check if peer name exists', { peerName, roomId })
            for (const id in this.peers[roomId]) {
              if (clientId !== id && this.peers[roomId][id].peerName === peerName) {
                log.debug('Peer name found', { peerName, roomId })
                cb(true)
                break
              }
            }
            break
          default:
            cb(false)
            break
        }
        cb(false)
      })

      socket.on('relayICE', async (args) => {
        const { clientId, iceCandidate } = args

        await this.sendToPeer(clientId, 'iceCandidate', {
          clientId: socket.id,
          iceCandidate,
        })
      })

      socket.on('relaySDP', async (args) => {
        const { clientId, sessionDescription } = args

        log.debug(`[${socket.id}] relay SessionDescription to [${clientId}] `, {
          type: sessionDescription.type,
        })

        await this.sendToPeer(clientId, 'sessionDescription', {
          clientId: socket.id,
          sessionDescription,
        })
      })

      socket.on('roomAction', async (args) => {
        args = checkXSS(args)
        const { roomId, clientId, peerUuid, peerName, password, action } = args
        const isPresenter = this.isPeerPresenter(roomId, clientId, peerName, peerUuid)
        const roomIslocked = action === 'lock'
        try {
          switch (action) {
            case 'lock':
              if (!isPresenter) {
                return
              }
              this.peers[roomId].lock = true
              this.peers[roomId].password = password
              await this.sendToRoom(roomId, socket.id, 'roomAction', {
                peerName,
                action,
              })
              break
            case 'unlock':
              if (!isPresenter) {
                return
              }
              delete this.peers[roomId].lock
              delete this.peers[roomId].password
              await this.sendToRoom(roomId, socket.id, 'roomAction', {
                peerName,
                action,
              })
              break
            case 'checkPassword':
              await this.sendToPeer(socket.id, 'roomAction', {
                peerName,
                action,
                password: password === this.peers[roomId].password ? 'OK' : 'KO',
              })
              break
          }
        } catch (err) {
          log.error('Room action', fmtError(err))
        }
        log.debug(`[${socket.id}] Room ${roomId}`, { locked: roomIslocked, password })
      })
      // 修改房间名
      socket.on('peerName', async (args) => {
        args = checkXSS(args)
        const { roomId, peerNameOld, peerNameNew } = args

        let clientIdToUpdate = null

        for (const clientId in this.peers[roomId]) {
          if (this.peers[roomId][clientId].peerName === peerNameOld && clientId === socket.id) {
            this.peers[roomId][clientId].peerName = peerNameNew
            if (this.presenters && this.presenters[roomId] && this.presenters[roomId][clientId]) {
              this.presenters[roomId][clientId].peerName = peerNameNew
            }
            clientIdToUpdate = clientId
            log.debug(`[${socket.id}] Peer name changed`, {
              peerNameOld,
              peerNameNew,
            })
            break
          }
        }

        if (clientIdToUpdate) {
          const data = {
            clientId: clientIdToUpdate,
            peerName: peerNameNew,
          }
          log.debug(`[${socket.id}] emit peerName to [roomId: ${roomId}]`, data)

          await this.sendToRoom(roomId, socket.id, 'peerName', data)
        }
      })

      socket.on('message', async (message) => {
        const data = checkXSS(message)
        log.debug('Got message', data)
        await this.sendToRoom(data.roomId, socket.id, 'message', data)
      })
      // 修改状态
      socket.on('peerStatus', async (args) => {
        args = checkXSS(args)
        const { roomId, peerName, clientId, element, status } = args
        const data = { clientId, peerName, element, status }

        try {
          for (const clientId in this.peers[roomId]) {
            if (this.peers[roomId][clientId].peerName === peerName && clientId === socket.id) {
              switch (element) {
                case 'video':
                  this.peers[roomId][clientId].peerVideo = status
                  break
                case 'audio':
                  this.peers[roomId][clientId].peerAudio = status
                  break
                case 'screen':
                  this.peers[roomId][clientId].peerScreen = status
                  break
                case 'hand':
                  this.peers[roomId][clientId].peerHandStatus = status
                  break
                case 'rec':
                  this.peers[roomId][clientId].peerRecordStatus = status
                  break
                case 'privacy':
                  this.peers[roomId][clientId].peerPrivacyStatus = status
                  break
              }
            }
          }

          log.debug(`[${socket.id}] emit peerStatus to [roomId: ${roomId}]`, data)

          await this.sendToRoom(roomId, socket.id, 'peerStatus', data)
        } catch (err) {
          log.error('Peer Status', fmtError(err))
        }
      })

      socket.on('peerAction', async (args) => {
        args = checkXSS(args)
        const { roomId, clientId, peerUuid, peerName, peerVideo, peerAction, sendToAll } = args

        // 只有主持人才能执行此操作
        const presenterActions = ['muteAudio', 'hideVideo', 'ejectAll']
        if (presenterActions.includes(peerAction)) {
          const isPresenter = this.isPeerPresenter(roomId, clientId, peerName, peerUuid)
          if (!isPresenter) {
            return
          }
        }

        const data = { clientId, peerName, peerAction, peerVideo }

        if (sendToAll) {
          log.debug(`[${socket.id}] emit peerAction to [room_id: ${roomId}]`, data)

          await this.sendToRoom(roomId, socket.id, 'peerAction', data)
        } else {
          log.debug(`[${socket.id}] emit peerAction to [${clientId}] from room_id [${roomId}]`)

          await this.sendToPeer(clientId, 'peerAction', data)
        }
      })

      // 踢出房间
      socket.on('kickOut', async (args) => {
        args = checkXSS(args)
        const { roomId, clientId, peerUuid, peerName } = args
        const isPresenter = this.isPeerPresenter(roomId, clientId, peerName, peerUuid)

        // 只有主持人才能踢出其他人
        if (isPresenter) {
          log.debug(`[${socket.id}] kick out peer [${clientId}] from room_id [${roomId}]`)

          await this.sendToPeer(clientId, 'kickOut', { peerName })
        }
      })

      // 转发 文件信息
      socket.on('fileInfo', async (args) => {
        args = checkXSS(args)
        const { roomId, clientId, peerName, broadcast, file } = args

        if (!isValidFileName(file.fileName)) {
          log.debug(`[${socket.id}] File name not valid`, args)
          return
        }

        log.debug(`[${socket.id}] Peer [${peerName}] send file to room_id [${roomId}]`, {
          peerName,
          broadcast,
          fileName: file.fileName,
          fileType: file.fileType,
          fileSize: bytesToSize(file.fileSize),
        })

        if (broadcast) {
          await this.sendToRoom(roomId, socket.id, 'fileInfo', args)
        } else {
          await this.sendToPeer(clientId, 'fileInfo', args)
        }
      })

      // 转发 终止文件共享
      socket.on('fileAbort', async (args) => {
        args = checkXSS(args)
        const { roomId, peerName } = args

        log.debug(`[${socket.id}] Peer [${peerName}] send fileAbort to room_id [${roomId}]`)
        await this.sendToRoom(roomId, socket.id, 'fileAbort')
      })

      /**
       * 转发 视频播放器动作
       */
      socket.on('videoPlayer', async (args) => {
        args = checkXSS(args)
        const { roomId, clientId, peerName, videoAction, videoSrc } = args

        if (videoAction === 'open' && !isValidHttpURL(videoSrc)) {
          log.debug(`[${socket.id}] Video src not valid`, args)
          return
        }

        const data = { clientId: socket.id, peerName, videoAction, videoSrc }

        if (clientId) {
          log.debug(`[${socket.id}] emit videoPlayer to [${clientId}] from room_id [${roomId}]`, data)

          await this.sendToPeer(clientId, 'videoPlayer', data)
        } else {
          log.debug(`[${socket.id}] emit videoPlayer to [room_id: ${roomId}]`, data)

          await this.sendToRoom(roomId, socket.id, 'videoPlayer', data)
        }
      })

      /**
       * 转发 同一房间中所有用户的白板操作
       */
      socket.on('wbCanvasToJson', async (args) => {
        args = checkXSS(args)
        await this.sendToRoom(args.roomId, socket.id, 'wbCanvasToJson', args)
      })
      socket.on('whiteboardAction', async (args) => {
        args = checkXSS(args)
        log.debug('Whiteboard', args)
        await this.sendToRoom(args.roomId, socket.id, 'whiteboardAction', args)
      })
    })
  }

  async handleJoin(socket: Socket, args: KeyValue) {
    const peerIp = socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress
    args = checkXSS(args)
    log.debug(`[${socket.id}] join `, args)

    const {
      roomId,
      roomPasswd,
      peerUuid,
      peerName,
      peerToken,
      peerVideo,
      peerAudio,
      peerScreen,
      peerHandStatus,
      peerRecordStatus,
      peerPrivacyStatus,
    } = args

    if (roomId in socket.rooms) {
      return log.debug(`[${socket.id}] [Warning] already joined`, roomId)
    }

    if (!(roomId in this.rooms)) {
      this.rooms[roomId] = {}
    }

    if (!(roomId in this.peers)) {
      this.peers[roomId] = {}
    }

    if (!(roomId in this.presenters)) {
      this.presenters[roomId] = {}
    }

    let isPresenter = true

    if (config.userAuth) {
      if (peerToken) {
        try {
          const { username, password, presenter } = checkXSS(decodeToken(peerToken))
          const isPeerValid = isAuthPeer(username, password)

          // 主持人
          isPresenter = presenter === '1'
          || presenter === 'true'
          || Object.keys(this.presenters[roomId]).length === 0

          log.debug(`[${socket.id}] JOIN ROOM - USER AUTH check peer`, {
            peerIp,
            peerUsername: username,
            peerPassword: password,
            peerValid: isPeerValid,
            peerPresenter: isPresenter,
          })

          if (!isPeerValid) {
            return socket.emit('unauthorized')
          }
        } catch (err) {
          // eslint-disable-next-line ts/ban-ts-comment
          // @ts-expect-error
          log.error(`[${socket.id}] [Warning] Join Room JWT error`, err.message)
          return socket.emit('unauthorized')
        }
      } else {
        return socket.emit('unauthorized')
      }
    }

    if (this.peers[roomId].lock === true && this.peers[roomId].password !== roomPasswd) {
      log.debug(`[${socket.id}] [Warning] Room Is Locked`, roomId)
      return socket.emit('roomIsLocked')
    }

    const presenter = {
      peerIp,
      peerName,
      peerUuid,
      isPresenter,
    }
    // 第一个进入者 或 config.roomPresenters 中指定的人 为主持人
    if (config.roomPresenters && config.roomPresenters.includes(peerName)) {
      this.presenters[roomId][socket.id] = presenter
    } else {
      if (Object.keys(this.presenters[roomId]).length === 0) {
        this.presenters[roomId][socket.id] = presenter
      }
    }

    const peerPresenter = peerToken
      ? isPresenter
      : this.isPeerPresenter(roomId, socket.id, peerName, peerUuid)

    this.peers[roomId][socket.id] = {
      peerName,
      peerPresenter,
      peerVideo,
      peerAudio,
      peerScreen,
      peerHandStatus,
      peerRecordStatus,
      peerPrivacyStatus,
    }

    const activeRooms = this.getActiveRooms()
    log.info('[Join] - active rooms and peers count', activeRooms)
    log.info('[Join] - connected presenters grp by roomId', this.presenters)
    log.info('[Join] - connected peers grp by roomId', this.peers)

    await this.createPeerTo(socket, roomId)

    this.rooms[roomId][socket.id] = socket
    socket.join(roomId) // 加入房间

    const peerCount = Object.keys(this.peers[roomId]).length

    // Send some server info to joined peer
    await this.sendToPeer(socket.id, 'serverInfo', {
      peersCount: peerCount,
      hostProtected: config.protected,
      userAuth: config.userAuth,
      peerPresenter,
    })
  }

  getIceServers() {
    return config.iceCandidate_servers
      .filter(server => server.enabled)
      .map((server) => {
        const { type, urls, username, credential } = server
        return type === 'stun' ? { urls } : { urls, username, credential }
      })
  }

  getActiveRooms() {
    const roomPeersArray = []
    // Iterate through each room
    for (const roomId in this.peers) {
      if (Object.prototype.hasOwnProperty.call(this.peers, roomId)) {
        // Get the count of peers in the current room
        const peersCount = Object.keys(this.peers[roomId]).length
        roomPeersArray.push({
          roomId,
          peersCount,
        })
      }
    }
    return roomPeersArray
  }

  async createPeerTo(socket: Socket, roomId: string) {
    for (const id in this.rooms[roomId]) {
      // offer false
      await this.rooms[roomId][id].emit('createPeer', {
        clientId: socket.id,
        peers: this.peers[roomId],
        shouldCreateOffer: false,
        iceServers: this.iceServers,
      })
      // offer true
      socket.emit('createPeer', {
        clientId: id,
        peers: this.peers[roomId],
        shouldCreateOffer: true,
        iceServers: this.iceServers,
      })
      log.debug(`[${socket.id}] emit createPeer [${id}]`)
    }
  }

  isPeerPresenter(roomId: string, clientId: string, peerName: string, peerUuid: string) {
    const { presenters } = this
    const room = presenters[roomId] as KeyValue
    try {
      if (!room || !room[clientId]) {
        for (const [socketId, presenter] of Object.entries(room || {})) {
          if (presenter.peerName === peerName) {
            log.debug(`[${clientId}] Presenter found`, room[socketId])
            return true
          }
        }
        return false
      }

      const isPresenter
            = (typeof room === 'object'
            && Object.keys(room[clientId]).length > 1
            && room[clientId].peerName === peerName
            && room[clientId].peerUuid === peerUuid)
            || (config.roomPresenters && config.roomPresenters.includes(peerName))

      log.debug(`[${clientId}] isPeerPresenter`, room[clientId])

      return isPresenter
    } catch (err) {
      log.error('isPeerPresenter', err)
      return false
    }
  }

  async sendToPeer(clientId: string, msg: string, args = {}) {
    if (clientId in this.sockets) {
      this.sockets[clientId].emit(msg, args)
    }
  }

  async sendToRoom(roomId: string, clientId: string, msg: any, args = {}) {
    for (const socketId in this.rooms[roomId]) {
      // 不能发给自己
      if (clientId !== socketId) {
        await this.rooms[roomId][clientId].emit(msg, args)
      }
    }
  }

  async removePeerFrom(socket: Socket, roomId: string) {
    try {
      socket.leave(roomId) // 离开房间
      delete this.rooms[roomId][socket.id]
      delete this.peers[roomId][socket.id]

      switch (Object.keys(this.peers[roomId]).length) {
        case 0: // 最后一个未设置房间锁和密码的对等设备与房间断开连接
          delete this.peers[roomId]
          delete this.presenters[roomId]
          break
        case 2: // 最后一个与设置了房间锁和密码的房间断开连接的对等方
          if (this.peers[roomId].lock && this.peers[roomId].password) {
            delete this.peers[roomId] // 清除房间中的锁和密码值
            delete this.presenters[roomId] // 清除频道中的主持人
          }
          break
      }
    } catch (err) {
      log.error('Remove Peer', fmtError(err))
    }

    const activeRooms = this.getActiveRooms()
    log.info('[removePeerFrom] - active rooms and peers count', activeRooms)
    log.info('[removePeerFrom] - connected presenters grp by roomId', this.presenters)
    log.info('[removePeerFrom] - connected peers grp by roomId', this.peers)

    for (const id in this.rooms[roomId]) {
      await this.rooms[roomId][id].emit('removePeer', { peer_id: socket.id })
      socket.emit('removePeer', { peer_id: id })
      log.debug(`[${socket.id}] emit removePeer [${id}]`)
    }
  }
}

export function useSocketServer(server: http.Server | https.Server, option?: ServerOptions) {
  return new SocketServer(server, option)
}
