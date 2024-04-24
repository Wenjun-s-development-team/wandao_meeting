import * as fns from 'date-fns'
import type { ComputedRef } from 'vue'

/**
 * 格式化日期
 *
 * @export
 * @param {string | number | Date} date 时间
 * @param {string} format 格式
 *
 * @see https://date-fns.org/v3.3.0/docs/format
 *
 * @return {*}  {string}
 */
export function formatTime(date: string | number | Date, format: string): string {
  return fns.format(date, format)
}

/**
 * 脚本执行时间
 * - const scriptTime = useScriptTime()
 * - scriptTime.start(): void 脚本执行开始
 * - ... 要执行的代码
 * - scriptTime.stop(title?: string): void 脚本执行停止
 * - 当 stop 传了 title 参数时，控制台将打印执行信息
 * @export
 * @return {*}  {({ time: ComputedRef<string>, start: () => void, stop: (title?: string) => void })}
 */
export function useScriptTime(): {
  time: ComputedRef<string>
  start: () => void
  stop: (title?: string) => void
} {
  const startTime = ref(0)
  const endTime = ref(0)
  const time = computed(() => ((endTime.value - startTime.value) / 1000).toFixed(4))

  const start = () => {
    if (typeof performance !== 'undefined') {
      startTime.value = performance.now()
    } else {
      startTime.value = new Date().getTime()
    }
  }

  /**
   * 脚本停止执行
   *
   * @param {string} [title]
   */
  const stop = (title?: string) => {
    if (typeof performance !== 'undefined') {
      endTime.value = performance.now()
    } else {
      endTime.value = new Date().getTime()
    }

    if (title) {
      console.log(`${title.padEnd(100, '-')} ⏰ ${time.value}`)
    }
  }

  return { time, start, stop }
}

/**
 * Seconds to HMS
 * @param {number} d
 * @return {string} format HH:MM:SS
 */
export function secondsToHms(d: number): string {
  d = Number(d)
  const h = Math.floor(d / 3600)
  const m = Math.floor((d % 3600) / 60)
  const s = Math.floor((d % 3600) % 60)
  const hDisplay = h > 0 ? `${h}h` : ''
  const mDisplay = m > 0 ? `${m}m` : ''
  const sDisplay = s > 0 ? `${s}s` : ''
  return `${hDisplay} ${mDisplay} ${sDisplay}`
}
