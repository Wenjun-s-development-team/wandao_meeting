import * as windows from './windows'

function errorMessage(message: string) {
  ElMessage({
    type: 'error',
    duration: 3000,
    grouping: true,
    message,
    dangerouslyUseHTMLString: true
  })
}

export class Request {
  /**
   * IPC通信: renderer -> main
   *
   * @static
   * @param {string} module 模块名
   * @param {string} method 接口名
   * @param {*} [data] 请求参数
   * @return {*}  {Promise<IIpc.DataResponse>}
   * @memberof Request
   */
  static request(module: string, method: string, data: KeyValue = {}): Promise<DataResponse> {
    // console.log('dataRequest', dataSourceName, method, data)

    return new Promise(async (resolve, reject) => {
      let response: any
      data = data || {}
      response = await window.ipcInvoke[module](method, JSON.stringify(data))

      if (response.code) {
        errorMessage(response.msg)
        return reject(response)
      }

      console.log('dataResponse:', response)

      return resolve(response)
    })
  }
}

export const IPCRequest = {
  windows
}
