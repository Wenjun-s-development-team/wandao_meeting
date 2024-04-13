/**
 * 按指定属性 获取对象数组唯一值
 *
 * @export
 * @template T
 * @template K
 * @param {T[]} arr
 * @param {string} prop
 * @return {*}  {T[]}
 */
export function arrayUnique<T, K extends keyof T>(arr: T[], prop: string): T[] {
  const seen = new Map<T[K], T>()
  return arr.filter((item) => !seen.has(item[prop]) && seen.set(item[prop], item))
}

// 移动数组元素到指定位置
export function moveArrayIndex(arr: Array<any>, fromIndex: number, toIndex: number) {
  const item = arr.splice(fromIndex, 1)[0]
  arr.splice(toIndex, 0, item)
  return arr
}
