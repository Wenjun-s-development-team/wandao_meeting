import process from 'node:process'
import type { ServerOptions } from 'socket.io'
import { useSocketServer, useWebServer } from './service'
import { config } from './config'

const webServer = useWebServer()
useSocketServer(webServer.server, {
  path: '/webrtc/p2p',
} as ServerOptions)

// 获取启动参数
const args = process.argv.slice(2)
if (args[0] === '--port' || args[0] === '-p') {
  config.port = Number.parseInt(args[1], 10)
}

webServer.listen(config.port)
