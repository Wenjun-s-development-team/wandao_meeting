import type { IpcMainInvokeEvent } from 'electron'

export interface IService {
  start: () => void
  success: (data?: any) => KeyValue
  error: (message: string) => KeyValue
}

export abstract class Service implements IService {
  start(): void {}

  methodHandler(event: IpcMainInvokeEvent, method: string, args: string) {
    console.log('methodHandler', method, args)
    if (typeof this[method] === 'function') {
      args = JSON.parse(args)
      return this[method](event, args)
    }
    const message = `${method} does not exist on the instance`
    console.log(message)
    return this.error(message)
  }

  private getCallerMethod() {
    const stack = new Error('堆栈跟踪').stack!
    const callerLine = stack.split('\n')[3]
    const callerMatch = callerLine.match(/at (.*?) \(/)

    if (callerMatch) {
      return callerMatch[1].replace('.', ':')
    }

    return this.constructor.name
  }

  success(data?: any): DataResponse {
    return {
      code: 0,
      msg: 'success',
      method: this.getCallerMethod(),
      ...(data || { data: null }),
    }
  }

  error(msg: string = 'error'): DataResponse {
    return {
      code: 1,
      msg,
      data: null,
      method: this.getCallerMethod(),
    }
  }
}
