import util from 'node:util'
import colors from 'colors'
import { fns } from '@/utils'

const options = {
  depth: null,
  colors: true,
}

export class Logs {
  declare appName: string
  declare startTime: number
  declare endTIme: number
  declare elapsedTime: string

  constructor(appName = 'Meeting P2P') {
    this.startTime = Date.now()
    this.appName = colors.yellow(appName)
  }

  /**
   * Console debug logs
   * @param {string} msg message
   * @param {object} op optional params
   * @returns
   */
  debug(msg: string, op: any = ''): void {
    this.endTIme = Date.now()
    this.elapsedTime = this.getFormatTime(Math.floor(this.endTIme - this.startTime))

    console.debug(
        `[${this.getDateTime()}] [${this.appName}] ${msg}`,
        util.inspect(op, options),
        this.elapsedTime,
    )

    this.startTime = Date.now()
  }

  /**
   * Console logs
   * @param {string} msg message
   * @param {object} op optional params
   * @returns
   */
  log(msg: string, op: any = '') {
    console.log(`[${this.getDateTime()}] [${this.appName}] ${msg}`, util.inspect(op, options))
  }

  /**
   * Console info logs
   * @param {string} msg message
   * @param {object} op optional params
   * @returns
   */
  info(msg: string, op: any = '') {
    console.info(
      `[${this.getDateTime()}] [${this.appName}] ${colors.green(msg)}`,
      util.inspect(op, options),
    )
  }

  /**
   * Console warning logs
   * @param {string} msg message
   * @param {object} op optional params
   * @returns
   */
  warn(msg: string, op: any = '') {
    console.info(
      `[${this.getDateTime()}] [${this.appName}] ${colors.yellow(msg)}`,
      util.inspect(op, options),
    )
  }

  /**
   * Console error logs
   * @param {string} msg message
   * @param {object} op optional params
   * @returns
   */
  error(msg: string, op: any = '') {
    console.info(
      `[${this.getDateTime()}] [${this.appName}] ${colors.red(msg)}`,
      util.inspect(op, options),
    )
  }

  /**
   * Get date time
   * @returns {string} date to Local String
   */
  getDateTime(): string {
    const currentTime = fns.format(Date.now(), 'yyyy-MM-dd HH:mm:ss')
    return colors.cyan(currentTime)
  }

  /**
   * Get format time
   * @param {integer} ms
   * @returns formatted time
   */
  getFormatTime(ms: number): string {
    let time = Math.floor(ms)
    let type = 'ms'

    if (ms >= 1000) {
      time = Math.floor((ms / 1000) % 60)
      type = 's'
    }
    if (ms >= 60000) {
      time = Math.floor((ms / 1000 / 60) % 60)
      type = 'm'
    }
    if (ms >= 6000000) {
      time = Math.floor((ms / 1000 / 60 / 60) % 24)
      type = 'h'
    }
    return colors.magenta(`+${time}${type}`)
  }
};
