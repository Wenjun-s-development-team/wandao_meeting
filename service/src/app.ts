import type { ServerOptions } from 'socket.io'
import { useSocketServer, useWebServer } from './service'
import { config } from '@/utils'

const webServer = useWebServer()
useSocketServer(webServer.server, {
  path: '/webrtc/p2p',
} as ServerOptions)

webServer.listen(config.port || 3000)
