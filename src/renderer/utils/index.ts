import CryptoJS from 'crypto-js'

export * from './array'
export * from './datetime'
export * from './lodash'
export * from './media'
export * from './system'

/**
 * 生成UUID
 * @export
 * @return {*}  {string}
 */
export function getUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 添加 px 单位
export function addUnit(value: number | string | null, unit: string = 'px'): string {
  if (value === null) {
    return ''
  }
  const REGEXP = /^-?\d+(\.\d+)?$/
  return REGEXP.test(`${value}`) ? `${value}${unit}` : String(value)
}

/**
 * Get random number
 * @param {integer} length of string
 * @returns {string} random number
 */
export function getRandomNumber(length: number = 5): string {
  let result = ''
  const characters = '0123456789'
  const charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

export function md5(input: string) {
  return CryptoJS.MD5(input).toString()
}
