import { FilterXSS } from 'xss'
import type { Client } from './client'
import { md5, playSound } from '@/utils'

const filterXSS = new FilterXSS().process

/**
 * 聊天
 */
export class ChatServer {
  client: Client

  isChatRoomVisible: boolean = false
  isCaptionBoxVisible: boolean = false
  showChatOnMessage: boolean = true
  speechInMessages: boolean = false

  chatDataChannels: { [key: string]: RTCDataChannel } = {}

  constructor(client: Client) {
    this.client = client
  }

  async createDataChannel(userId: number) {
    this.chatDataChannels[userId] = this.client.peerConnections[userId].createDataChannel('chat_channel')
    this.chatDataChannels[userId].onopen = (event) => {
      console.log('chatDataChannels created', event)
    }
  }

  removeDataChannel(userId: number) {
    delete this.chatDataChannels[userId]
  }

  cleanDataChannel() {
    this.chatDataChannels = {}
  }

  /**
   * 处理聊天消息
   * @param {KeyValue} dataMessage chat messages
   */
  onMessage(dataMessage: KeyValue) {
    if (!dataMessage) {
      return
    }

    const msgFrom = filterXSS(dataMessage.from)
    const msgFromId = filterXSS(dataMessage.fromId)
    const msgTo = filterXSS(dataMessage.to)
    const msg = filterXSS(dataMessage.msg)
    const msgPrivate = filterXSS(dataMessage.privateMsg)
    // const msgId = filterXSS(dataMessage.id)

    const fromPeerName = this.client.allPeers[msgFromId].roomName
    if (fromPeerName !== msgFrom) {
      console.log('Fake message detected', { realFrom: fromPeerName, fakeFrom: msgFrom, msg })
      return
    }

    // private message but not for me return
    if (msgPrivate && msgTo !== this.client.roomName) {
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

  onSpeech(dataMessage: KeyValue) {
    if (!dataMessage) {
      return
    }
    console.log('Handle speech transcript', dataMessage)

    dataMessage.textData = filterXSS(dataMessage.textData)
    dataMessage.roomName = filterXSS(dataMessage.roomName)

    const { roomName, textData } = dataMessage

    const timeStamp = this.getFormatDate(new Date())
    const avatarImage = this.isValidEmail(roomName) ? this.genGravatar(roomName) : this.genAvatarSvg(roomName, 32)
    console.log(timeStamp, avatarImage, textData)
    if (!this.isCaptionBoxVisible) {
      // TODO
    }
    playSound('speech')
  }

  onRecording() {

  }

  /**
   * 语音消息
   * https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance
   *
   * @param {boolean} newMsg true/false
   * @param {string} from roomName
   * @param {string} msg message
   */
  speechMessage(newMsg: boolean = true, from: string, msg: string) {
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
    return `https://www.gravatar.com/avatar/${hash}${size ? `?s=${size}` : '?s=250'}`
  }

  /**
   * Create round svg image with first 2 letters of roomName in center
   * Thank you: https://github.com/phpony
   *
   * @param {string} roomName
   * @param {integer} avatarImgSize width and height in px
   */
  genAvatarSvg(roomName: string, avatarImgSize: number) {
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
  isValidEmail(email: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * 音量
   * @param {KeyValue} data peer audio
   */
  onVolume(data: KeyValue) {
    console.log(data)
  }
}
