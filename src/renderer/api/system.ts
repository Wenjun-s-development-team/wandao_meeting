import { Request } from '.'

/**
 * 获取 desktopCapturer
 *
 * @export
 * @return {*}  {Promise<DataResponse>}
 */
export function getSources(): Promise<DataResponse> {
  return Request.ipc('system', 'getSources')
}
