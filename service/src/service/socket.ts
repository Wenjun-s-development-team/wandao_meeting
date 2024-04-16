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
  channels: KeyValue = {}
  sockets: { [key: string]: Socket } = {}
  peers: KeyValue = {}
  presenters: KeyValue = {}

  constructor(server: http.Server | https.Server, option?: ServerOptions) {
    this.setIceServers()
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

      socket.on('join', args => this.onJoin(socket, args))

      socket.on('disconnect', async (reason) => {
        for (const channel in socket.rooms) {
          await this.removePeerFrom(socket, channel)
        }
        log.debug(`[${socket.id}] disconnected`, { reason })
        delete this.sockets[socket.id]
      })

      socket.on('data', async (args, cb) => {
        args = checkXSS(args)

        log.debug('Socket Promise', args)
        const { roomId, peerId, peerName, method } = args

        switch (method) {
          case 'checkPeerName':
            log.debug('Check if peer name exists', { peerName, roomId })
            for (const id in this.peers[roomId]) {
              if (peerId !== id && this.peers[roomId][id].peerName === peerName) {
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
        const { peerId, iceCandidate } = args

        await this.sendToPeer(peerId, 'iceCandidate', {
          peerId: socket.id,
          iceCandidate,
        })
      })

      socket.on('relaySDP', async (args) => {
        const { peerId, sessionDescription } = args

        log.debug(`[${socket.id}] relay SessionDescription to [${peerId}] `, {
          type: sessionDescription.type,
        })

        await this.sendToPeer(peerId, 'sessionDescription', {
          peerId: socket.id,
          sessionDescription,
        })
      })

      socket.on('roomAction', async (args) => {
        args = checkXSS(args)
        const { roomId, peerId, peerName, peerUuid, password, action } = args
        const isPresenter = this.isPeerPresenter(roomId, peerId, peerName, peerUuid)
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

      socket.on('peerName', async (args) => {
        args = checkXSS(args)
        const { roomId, peerNameOld, peerNameNew } = args

        let peerIdToUpdate = null

        for (const peerId in this.peers[roomId]) {
          if (this.peers[roomId][peerId].peerName === peerNameOld && peerId === socket.id) {
            this.peers[roomId][peerId].peerName = peerNameNew
            if (this.presenters && this.presenters[roomId] && this.presenters[roomId][peerId]) {
              this.presenters[roomId][peerId].peerName = peerNameNew
            }
            peerIdToUpdate = peerId
            log.debug(`[${socket.id}] Peer name changed`, {
              peerNameOld,
              peerNameNew,
            })
            break
          }
        }

        if (peerIdToUpdate) {
          const data = {
            peerId: peerIdToUpdate,
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

      socket.on('peerStatus', async (args) => {
        args = checkXSS(args)
        const { roomId, peerName, peerId, element, status } = args
        const data = { peerId, peerName, element, status }

        try {
          for (const peerId in this.peers[roomId]) {
            if (this.peers[roomId][peerId].peerName === peerName && peerId === socket.id) {
              switch (element) {
                case 'video':
                  this.peers[roomId][peerId].peerVideoStatus = status
                  break
                case 'audio':
                  this.peers[roomId][peerId].peerAudioStatus = status
                  break
                case 'screen':
                  this.peers[roomId][peerId].peerScreenStatus = status
                  break
                case 'hand':
                  this.peers[roomId][peerId].peerHandStatus = status
                  break
                case 'rec':
                  this.peers[roomId][peerId].peerRecStatus = status
                  break
                case 'privacy':
                  this.peers[roomId][peerId].peerPrivacyStatus = status
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
        const { roomId, peerId, peerUuid, peerName, peerUseVideo, peerAction, sendToAll } = args

        // 只有演示者才能执行此操作
        const presenterActions = ['muteAudio', 'hideVideo', 'ejectAll']
        if (presenterActions.includes(peerAction)) {
          const isPresenter = this.isPeerPresenter(roomId, peerId, peerName, peerUuid)
          if (!isPresenter) {
            return
          }
        }

        const data = { peerId, peerName, peerAction, peerUseVideo }

        if (sendToAll) {
          log.debug(`[${socket.id}] emit peerAction to [room_id: ${roomId}]`, data)

          await this.sendToRoom(roomId, socket.id, 'peerAction', data)
        } else {
          log.debug(`[${socket.id}] emit peerAction to [${peerId}] from room_id [${roomId}]`)

          await this.sendToPeer(peerId, 'peerAction', data)
        }
      })

      // 踢出房间
      socket.on('kickOut', async (args) => {
        args = checkXSS(args)
        const { roomId, peerId, peerUuid, peerName } = args
        const isPresenter = this.isPeerPresenter(roomId, peerId, peerName, peerUuid)

        // 只有演示者才能踢出其他人
        if (isPresenter) {
          log.debug(`[${socket.id}] kick out peer [${peerId}] from room_id [${roomId}]`)

          await this.sendToPeer(peerId, 'kickOut', { peerName })
        }
      })

      // 转发 文件信息
      socket.on('fileInfo', async (args) => {
        args = checkXSS(args)
        const { roomId, peerId, peerName, broadcast, file } = args

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
          await this.sendToPeer(peerId, 'fileInfo', args)
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
        const { roomId, peerId, peerName, videoAction, videoSrc } = args

        if (videoAction === 'open' && !isValidHttpURL(videoSrc)) {
          log.debug(`[${socket.id}] Video src not valid`, args)
          return
        }

        const data = { peerId: socket.id, peerName, videoAction, videoSrc }

        if (peerId) {
          log.debug(`[${socket.id}] emit videoPlayer to [${peerId}] from room_id [${roomId}]`, data)

          await this.sendToPeer(peerId, 'videoPlayer', data)
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

  async onJoin(socket: Socket, args: KeyValue) {
    const peerIp = socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress
    args = checkXSS(args)
    log.debug(`[${socket.id}] join `, args)

    const {
      channel,
      channelPassword,
      peerUuid,
      peerName,
      peerToken,
      peerVideo,
      peerAudio,
      peerVideoStatus,
      peerAudioStatus,
      peerScreenStatus,
      peerHandStatus,
      peerRecStatus,
      peerPrivacyStatus,
      peerInfo,
    } = args

    if (channel in socket.rooms) {
      return log.debug(`[${socket.id}] [Warning] already joined`, channel)
    }

    if (!(channel in this.channels)) {
      this.channels[channel] = {}
    }

    if (!(channel in this.peers)) {
      this.peers[channel] = {}
    }

    if (!(channel in this.presenters)) {
      this.presenters[channel] = {}
    }

    let isPresenter = true

    if (config.userAuth) {
      if (peerToken) {
        try {
          const { username, password, presenter } = checkXSS(decodeToken(peerToken))
          const isPeerValid = isAuthPeer(username, password)

          // 演示者
          isPresenter = presenter === '1'
          || presenter === 'true'
          || Object.keys(this.presenters[channel]).length === 0

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

    if (this.peers[channel].lock === true && this.peers[channel].password !== channelPassword) {
      log.debug(`[${socket.id}] [Warning] Room Is Locked`, channel)
      return socket.emit('roomIsLocked')
    }

    const presenter = {
      peerIp,
      peerName,
      peerUuid,
      isPresenter,
    }
    // 第一个进入者 或 config.roomPresenters 中指定的人 为演示者
    if (config.roomPresenters && config.roomPresenters.includes(peerName)) {
      this.presenters[channel][socket.id] = presenter
    } else {
      if (Object.keys(this.presenters[channel]).length === 0) {
        this.presenters[channel][socket.id] = presenter
      }
    }

    const peerPresenter = peerToken
      ? isPresenter
      : this.isPeerPresenter(channel, socket.id, peerName, peerUuid)

    const { osName, osVersion, browserName, browserVersion } = peerInfo

    this.peers[channel][socket.id] = {
      peerName,
      peerPresenter,
      peerVideo,
      peerAudio,
      peerVideoStatus,
      peerAudioStatus,
      peerScreenStatus,
      peerHandStatus,
      peerRecStatus,
      peerPrivacyStatus,
      os: osName ? `${osName} ${osVersion}` : '',
      browser: browserName ? `${browserName} ${browserVersion}` : '',
    }

    const activeRooms = this.getActiveRooms()
    log.info('[Join] - active rooms and peers count', activeRooms)
    log.info('[Join] - connected presenters grp by roomId', this.presenters)
    log.info('[Join] - connected peers grp by roomId', this.peers)

    await this.addPeerTo(socket, channel)

    this.channels[channel][socket.id] = socket
    socket.join(channel) // 加入房间

    const peerCount = Object.keys(this.peers[channel]).length

    // Send some server info to joined peer
    await this.sendToPeer(socket.id, 'serverInfo', {
      peersCount: peerCount,
      hostProtected: config.protected,
      userAuth: config.userAuth,
      peerPresenter,
    })
  }

  setIceServers() {
    this.iceServers = []

    // 非内部网络必须使用Stun
    if (config.stun_server_enabled && config.stun_server_url) {
      this.iceServers.push({ urls: config.stun_server_url })
    }
    // 如果无法进行直接对等连接，则建议使用Turn
    if (config.turn_server_enabled && config.turn_server_url && config.turn_server_username && config.turn_server_credential) {
      this.iceServers.push({ urls: config.turn_server_url, username: config.turn_server_username, credential: config.turn_server_credential })
    }
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

  async addPeerTo(socket: Socket, channel: string) {
    for (const id in this.channels[channel]) {
      // offer false
      await this.channels[channel][id].emit('addPeer', {
        peer_id: socket.id,
        peers: this.peers[channel],
        should_create_offer: false,
        iceServers: this.iceServers,
      })
      // offer true
      socket.emit('addPeer', {
        peer_id: id,
        peers: this.peers[channel],
        should_create_offer: true,
        iceServers: this.iceServers,
      })
      log.debug(`[${socket.id}] emit addPeer [${id}]`)
    }
  }

  isPeerPresenter(channel: string, peerId: string, peerName: string, peerUuid: string) {
    const { presenters } = this
    const room = presenters[channel] as KeyValue
    try {
      if (!room || !room[peerId]) {
        for (const [existingPeerID, presenter] of Object.entries(room || {})) {
          if (presenter.peerName === peerName) {
            log.debug(`[${peerId}] Presenter found`, room[existingPeerID])
            return true
          }
        }
        return false
      }

      const isPresenter
            = (typeof room === 'object'
            && Object.keys(room[peerId]).length > 1
            && room[peerId].peerName === peerName
            && room[peerId].peerUuid === peerUuid)
            || (config.roomPresenters && config.roomPresenters.includes(peerName))

      log.debug(`[${peerId}] isPeerPresenter`, room[peerId])

      return isPresenter
    } catch (err) {
      log.error('isPeerPresenter', err)
      return false
    }
  }

  async sendToPeer(peerId: string, msg: string, config = {}) {
    if (peerId in this.sockets) {
      this.sockets[peerId].emit(msg, config)
    }
  }

  async sendToRoom(roomId: string, socketId: string, msg: any, config = {}) {
    for (const peerId in this.channels[roomId]) {
      // 不能发给自己
      if (peerId !== socketId) {
        await this.channels[roomId][peerId].emit(msg, config)
      }
    }
  }

  async removePeerFrom(socket: Socket, channel: string) {
    try {
      socket.leave(channel) // 离开房间
      delete this.channels[channel][socket.id]
      delete this.peers[channel][socket.id]

      switch (Object.keys(this.peers[channel]).length) {
        case 0: // 最后一个未设置房间锁和密码的对等设备与房间断开连接
          delete this.peers[channel]
          delete this.presenters[channel]
          break
        case 2: // 最后一个与设置了房间锁和密码的房间断开连接的对等方
          if (this.peers[channel].lock && this.peers[channel].password) {
            delete this.peers[channel] // 清除房间中的锁和密码值
            delete this.presenters[channel] // 清除频道中的演示者
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

    for (const id in this.channels[channel]) {
      await this.channels[channel][id].emit('removePeer', { peer_id: socket.id })
      socket.emit('removePeer', { peer_id: id })
      log.debug(`[${socket.id}] emit removePeer [${id}]`)
    }
  }
}

export function useSocketServer(server: http.Server | https.Server, option?: ServerOptions) {
  return new SocketServer(server, option)
}
