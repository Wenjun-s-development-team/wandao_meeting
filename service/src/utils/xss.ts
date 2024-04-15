import xss from 'xss'
import { Logs } from '@/service'

function objectToJSONString(dataObject: any): string | false {
  try {
    return JSON.stringify(dataObject)
  } catch (error) {
    return false
  }
}

function JSONStringToObject(jsonString: string): any {
  try {
    return JSON.parse(jsonString)
  } catch (error) {
    return false
  }
}

/**
 * 防止客户端XSS注入防止客户端XSS注入
 *
 * @param {object} dataObject
 * @returns sanitized object
 */
export function checkXSS(dataObject: any): any {
  const log = new Logs('xss')
  try {
    if (Array.isArray(dataObject)) {
      if (Object.keys(dataObject).length > 0 && typeof dataObject[0] === 'object') {
        dataObject.forEach((obj) => {
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              const objectJson = objectToJSONString(obj[key])
              if (objectJson) {
                const jsonString = xss(objectJson)
                const jsonObject = JSONStringToObject(jsonString)
                if (jsonObject) {
                  obj[key] = jsonObject
                }
              }
            }
          }
        })
        log.debug('XSS Array of Object sanitization done')
        return dataObject
      }
    } else if (typeof dataObject === 'object') {
      const objectJson = objectToJSONString(dataObject)
      if (objectJson) {
        const jsonString = xss(objectJson)
        const jsonObject = JSONStringToObject(jsonString)
        if (jsonObject) {
          log.debug('XSS Object sanitization done')
          return jsonObject
        }
      }
    } else if (typeof dataObject === 'string' || dataObject instanceof String) {
      log.debug('XSS String sanitization done')
      return xss(dataObject as string)
    }
    log.warn('XSS not sanitized', dataObject)
    return dataObject
  } catch (error) {
    log.error('XSS error', { data: dataObject, error })
    return dataObject
  }
}
