import { useSocketServer, useWebServer } from './service'
import { config } from '@/utils'

const webServer = useWebServer()
useSocketServer(webServer.server)

webServer.listen(config.port || 3000)
