import jwt from 'jsonwebtoken'
import CryptoJS from 'crypto-js'
import { config } from '../config'

export * from '../config'
export * from './xss'
export * as fns from 'date-fns'

/**
 * 编码JWT令牌
 * @param {object} token
 * @returns
 */
export function encodeToken(token: KeyValue): string {
  if (!token) {
    return ''
  }

  const { username = 'username', password = 'password', presenter = false, expire } = token

  const expireValue = expire || config.JWT_EXP

  const payload = {
    username: String(username),
    password: String(password),
    presenter: String(presenter),
  }

  const payloadString = JSON.stringify(payload)
  const encryptedPayload = CryptoJS.AES.encrypt(payloadString, config.JWT_KEY).toString()

  const jwtToken = jwt.sign({ data: encryptedPayload }, config.JWT_KEY, { expiresIn: expireValue })
  return jwtToken
}

/**
 * 解码JWT令牌
 *
 * @export
 * @param {string} jwtToken
 * @return {*}
 */
export function decodeToken(jwtToken: string): KeyValue | null {
  if (!jwtToken) {
    return null
  }

  const decodedToken = jwt.verify(jwtToken, config.JWT_KEY) as any
  if (!decodedToken || !decodedToken.data) {
    throw new Error('Invalid token')
  }

  // Decrypt the payload using AES decryption
  const decryptedPayload = CryptoJS.AES.decrypt(
    decodedToken.data,
    config.JWT_KEY,
  ).toString(CryptoJS.enc.Utf8)

  // Parse the decrypted payload as JSON
  const payload = JSON.parse(decryptedPayload)

  return payload
}

export function isAuthPeer(username: string, password: string): boolean {
  return config.users && config.users.some(user => user.username === username && user.password === password)
}

export function fmtError(data: any) {
  return JSON.stringify(data, null, 4)
}

export function isValidFileName(fileName: string): boolean {
  const invalidChars = /[\\\/\?\*\|:"<>]/
  return !invalidChars.test(fileName)
}

export function bytesToSize(bytes: number, decimals = 2): string {
  if (bytes === 0) {
    return '0 Bytes'
  }

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`
}

export function isValidHttpURL(url: string): boolean {
  const pattern = new RegExp(
    '^(https?:\\/\\/)?'
    + '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'
    + '((\\d{1,3}\\.){3}\\d{1,3}))'
    + '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'
    + '(\\?[;&a-z\\d%_.~+=-]*)?'
    + '(\\#[-a-z\\d_]*)?$',
    'i',
  )
  return pattern.test(url)
}

export function getIP(req: any) {
  return req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip
}
