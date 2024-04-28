export function setProperty(key: string, value: string) {
  return document.documentElement.style.setProperty(key, value)
}

// 添加 px 单位
export function addUnit(value: number | string | null, unit: string = 'px'): string {
  if (value === null) {
    return ''
  }
  const REGEXP = /^-?\d+(\.\d+)?$/
  return REGEXP.test(`${value}`) ? `${value}${unit}` : String(value)
}
