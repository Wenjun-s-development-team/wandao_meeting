import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import axios from 'axios'
import * as windows from './windows'
import * as system from './system'

function errorMessage(message: string) {
  ElMessage({
    type: 'error',
    duration: 3000,
    grouping: true,
    message,
    dangerouslyUseHTMLString: true,
  })
}

const token = useLocalStorage('token', '')

export class AxiosClient {
  private static instance: AxiosInstance

  static createInstance(config?: AxiosRequestConfig) {
    if (!AxiosClient.instance) {
      AxiosClient.instance = axios.create({
        ...config,
        baseURL: import.meta.env.RENDERER_VITE_WEBRTC_API_URL,
      })

      // 添加请求拦截器
      AxiosClient.instance.interceptors.request.use((config) => {
        if (token.value) {
          config.headers.Authorization = token.value
        }
        return config
      }, (error) => {
        return Promise.reject(error)
      })

      // 添加响应拦截器
      AxiosClient.instance.interceptors.response.use((response) => {
        const { data } = response
        if (data.code) {
          errorMessage(data.msg || data.message)
          return Promise.reject(data)
        }
        return Promise.resolve(data)
      }, (error) => {
        if (error.response) {
          // 状态码不在 2xx 范围内
          errorMessage(error.response?.data?.message || error.message)
        } else if (error.request) {
          // 请求已发出，但没有收到任何响应
          console.error('No response was received', error.request)
        } else {
          console.error('Error', error.message)
        }
        return Promise.reject(error)
      })
    }
    return AxiosClient
  }

  static get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return AxiosClient.instance.get(url, config)
  }

  static post<T = any>(url: string, data?: KeyValue, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return AxiosClient.instance.post(url, data, config)
  }

  static put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return AxiosClient.instance.put(url, data, config)
  }

  static delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return AxiosClient.instance.delete(url, config)
  }

  static async userLogin(param?: KeyValue) {
    const { data } = await AxiosClient.post('/user/login', param)
    token.value = data.token
    return Promise.resolve(data)
  }
}

export class Request {
  /**
   * IPC通信: renderer -> main
   *
   * @static
   * @param {string} module 模块名
   * @param {string} method 接口名
   * @param {*} [data] 请求参数
   * @return {*}  {Promise<DataResponse>}
   * @memberof Request
   */
  static ipc(module: string, method: string, data: KeyValue = {}): Promise<DataResponse> {
    // console.log('dataRequest', dataSourceName, method, data)

    return new Promise(async (resolve, reject) => {
      data = data || {}
      const response = await window.ipcInvoke[module](method, JSON.stringify(data))

      if (response.code) {
        errorMessage(response.msg)
        return reject(response)
      }

      console.log('dataResponse:', response)

      return resolve(response)
    })
  }
}

export const RTCRequest = AxiosClient.createInstance()

export const IPCRequest = {
  windows,
  system,
}
