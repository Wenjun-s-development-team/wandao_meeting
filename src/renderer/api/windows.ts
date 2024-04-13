import { Request } from '.'

/**
 * 关闭窗口
 *
 * @export
 * @return {*}  {Promise<DataResponse>}
 */
export function close(): Promise<DataResponse> {
  return Request.request('windows', 'closeWindow')
}

/**
 * 窗口最小化
 *
 * @export
 * @return {*}  {Promise<DataResponse>}
 */
export function minimize(): Promise<DataResponse> {
  return Request.request('windows', 'minimizeWindow')
}
/**
 * 窗口最大化
 *
 * @export
 * @return {*}  {Promise<DataResponse>}
 */
export function maximize(): Promise<DataResponse> {
  return Request.request('windows', 'maximizeWindow')
}
