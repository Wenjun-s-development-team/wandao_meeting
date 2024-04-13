export interface IService {
  start: () => void
  success: (data?: any) => KeyValue
  error: (message: string) => KeyValue
}

export abstract class Service implements IService {
  start(): void {}

  private getCallerMethod() {
    const stack = new Error('堆栈跟踪').stack!
    const callerLine = stack.split('\n')[3]
    const callerMatch = callerLine.match(/at (.*?) \(/)

    if (callerMatch) {
      return callerMatch[1].replace('.', ':')
    }

    return this.constructor.name
  }

  success(data?: any): KeyValue {
    return {
      code: 0,
      msg: 'success',
      method: this.getCallerMethod(),
      ...(data || {})
    }
  }

  error(msg: string = 'error'): KeyValue {
    return {
      code: 1,
      msg,
      method: this.getCallerMethod()
    }
  }
}
