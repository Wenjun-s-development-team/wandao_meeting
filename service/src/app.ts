import process from 'node:process'
import type { ServerOptions } from 'socket.io'
import { useSocketServer, useWebServer } from './service'

const webServer = useWebServer()
useSocketServer(webServer.server, {
  path: '/webrtc/p2p',
} as ServerOptions)

// 获取所有的启动参数
const args = process.argv.slice(2)

let port = 8686
if (args[0] === '--port' || args[0] === '-p') {
  port = Number.parseInt(args[1], 10)
}

webServer.listen(port || 3000)
