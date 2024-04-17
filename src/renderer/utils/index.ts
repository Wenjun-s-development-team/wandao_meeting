import CryptoJS from 'crypto-js'

export * from './array'
export * from './datetime'
export * from './lodash'
export * from './media'
export * from './system'

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
