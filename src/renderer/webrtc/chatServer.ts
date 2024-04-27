import { storeToRefs } from 'pinia'
import { FilterXSS } from 'xss'
import { Client } from '.'
import { md5, playSound } from '@/utils'
import { useWebrtcStore } from '@/store'

const webrtcStore = useWebrtcStore()
const {
  local,
  remotePeers,
} = storeToRefs(webrtcStore)

const filterXSS = new FilterXSS().process

/**
 * 聊天
 */
export class ChatServer {
  static isChatRoomVisible: boolean = false
  static isCaptionBoxVisible: boolean = false
  static showChatOnMessage: boolean = true
  static speechInMessages: boolean = false

  static chatDataChannels: { [key: string]: RTCDataChannel } = {}

  static async createDataChannel(userId: number) {
    ChatServer.chatDataChannels[userId] = Client.peerConnections[userId].createDataChannel('chat_channel')
    ChatServer.chatDataChannels[userId].onopen = (event) => {
      console.log('chatDataChannels created', event)
    }
  }

  static removeDataChannel(userId: number) {
    delete ChatServer.chatDataChannels[userId]
  }

  static cleanDataChannel() {
    ChatServer.chatDataChannels = {}
  }

  static async sendToDataChannel(config) {
    if (Client.peerCount() && typeof config === 'object' && config !== null) {
      for (const userId in ChatServer.chatDataChannels) {
        if (ChatServer.chatDataChannels[userId].readyState === 'open') {
          await ChatServer.chatDataChannels[userId].send(JSON.stringify(config))
        }
      }
    }
  }

  /**
   * 处理聊天消息
   * @param {KeyValue} dataMessage chat messages
   */
  static onMessage(dataMessage: KeyValue) {
    if (!dataMessage) {
      return
    }

    const msgFrom = filterXSS(dataMessage.from)
    const msgFromId = filterXSS(dataMessage.fromId)
    const msgTo = filterXSS(dataMessage.to)
    const msg = filterXSS(dataMessage.msg)
    const msgPrivate = filterXSS(dataMessage.privateMsg)
    // const msgId = filterXSS(dataMessage.id)

    const fromPeerName = Client.allPeers[msgFromId].roomName
    if (fromPeerName !== msgFrom) {
      console.log('Fake message detected', { realFrom: fromPeerName, fakeFrom: msgFrom, msg })
      return
    }

    // private message but not for me return
    if (msgPrivate && msgTo !== local.value.roomName) {
      return
    }

    console.log('handleDataChannelChat', dataMessage)

    // 给我的聊天信息
    if (!ChatServer.isChatRoomVisible && ChatServer.showChatOnMessage) {
      //
    }
    // show message from
    if (!ChatServer.showChatOnMessage) {
      console.log('toast', `New message from: ${msgFrom}`)
    }

    ChatServer.speechInMessages ? ChatServer.speechMessage(true, msgFrom, msg) : playSound('chatMessage')
  }

  static onSpeech(dataMessage: KeyValue) {
    if (!dataMessage) {
      return
    }
    console.log('Handle speech transcript', dataMessage)

    dataMessage.textData = filterXSS(dataMessage.textData)
    dataMessage.roomName = filterXSS(dataMessage.roomName)

    const { roomName, textData } = dataMessage

    const timeStamp = ChatServer.getFormatDate(new Date())
    const avatarImage = ChatServer.isValidEmail(roomName) ? ChatServer.genGravatar(roomName) : ChatServer.genAvatarSvg(roomName, 32)
    console.log(timeStamp, avatarImage, textData)
    if (!ChatServer.isCaptionBoxVisible) {
      // TODO
    }
    playSound('speech')
  }

  static onRecording() {

  }

  /**
   * 收到对方的音量
   * @param {KeyValue} data peer audio
   */
  static onVolume(data: KeyValue) {
    if (remotePeers.value[data.userId]) {
      remotePeers.value[data.userId].finalVolume = data.volume
    }
  }

  /**
   * 语音消息
   * https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance
   *
   * @param {boolean} newMsg true/false
   * @param {string} from roomName
   * @param {string} msg message
   */
  static speechMessage(newMsg: boolean = true, from: string, msg: string) {
    const speech = new SpeechSynthesisUtterance()
    speech.text = `${newMsg ? 'New' : ''} message from:${from}. The message is:${msg}`
    speech.rate = 0.9
    window.speechSynthesis.speak(speech)
  }

  /**
   * Format date
   * @param {Date} date
   * @returns {string} date format h:m:s
   */
  static getFormatDate(date: Date): string {
    const time = date.toTimeString().split(' ')[0]
    return `${time}`
  }

  /**
   * Get Gravatar from email
   * @param {string} email
   * @param {number} size
   * @returns object image
   */
  static genGravatar(email: string, size: number = 0) {
    const hash = md5(email.toLowerCase().trim())
    return `https://www.gravatar.com/avatar/${hash}${size ? `?s=${size}` : '?s=250'}`
  }

  /**
   * Create round svg image with first 2 letters of roomName in center
   * Thank you: https://github.com/phpony
   *
   * @param {string} roomName
   * @param {integer} avatarImgSize width and height in px
   */
  static genAvatarSvg(roomName: string, avatarImgSize: number) {
    const charCodeRed = roomName.charCodeAt(0)
    const charCodeGreen = roomName.charCodeAt(1) || charCodeRed
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
              fill="${textColor}">${roomName.substring(0, 2).toUpperCase()}
          </text>
      </svg>`
    return `data:image/svg+xml,${svg.replace(/#/g, '%23').replace(/"/g, '\'').replace(/&/g, '&amp;')}`
  }

  /**
   * Check if valid email
   * @param {string} email
   * @returns boolean
   */
  static isValidEmail(email: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}
