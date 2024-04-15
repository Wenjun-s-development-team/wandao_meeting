import http from 'node:http'
import https from 'node:https'

import process from 'node:process'
import path from 'node:path'
import fs from 'node:fs'
import cors from 'cors'
import compression from 'compression'
import bodyParser from 'body-parser'
import express from 'express'

import { checkXSS, config, encodeToken, getIP, isAuthPeer } from '@/utils'
import { Host, Logs } from '@/service'

const log = new Logs('WebRTCServer')
const authHost = new Host()

const hostConfig = {
  protected: config.protected,
  userAuth: config.userAuth,
  users: config.users,
  authenticated: !config.protected,
}

export class WebServer {
  server: http.Server | https.Server

  constructor() {
    const app = express()

    app.use(cors(config.cors))
    app.use(compression())
    app.use(express.json())
    app.use(bodyParser.urlencoded({ extended: true }))

    // Logs requests
    app.use((req, _, next) => {
      log.debug('New request:', {
        body: req.body,
        method: req.method,
        path: req.originalUrl,
      })
      next()
    })

    app.get('*', (_, __, next) => next())
    app.post('*', (_, __, next) => next())

    // 删除url中的尾部斜杠、错误处理
    app.use((err: any, req: express.Request, res: express.Response, next: Function) => {
      if (err instanceof SyntaxError || err.status === 400 || 'body' in err) {
        log.error('Request Error', {
          header: req.headers,
          body: req.body,
          error: err.message,
        })
        return res.status(400).send({ status: 404, message: err.message })
      }

      if (req.path.substring(-1) === '/' && req.path.length > 1) {
        const query = req.url.slice(req.path.length)
        res.redirect(301, req.path.slice(0, -1) + query)
      } else {
        next()
      }
    })

    app.post(['/login'], (req, res) => {
      const ip = getIP(req)
      log.debug(`Request login to host from: ${ip}`, req.body)
      const { username, password } = checkXSS(req.body)

      const isPeerValid = isAuthPeer(username, password)

      if (config.protected && isPeerValid && !hostConfig.authenticated) {
        const ip = getIP(req)
        hostConfig.authenticated = true
        authHost.setAuthorizedIP(ip, true)
        log.debug('HOST LOGIN OK', {
          ip,
          authorized: authHost.isAuthorizedIP(ip),
          authorizedIps: authHost.getAuthorizedIPs(),
        })
        const token = encodeToken({ username, password, presenter: true })
        return res.status(200).json({ message: token })
      }

      // Peer auth valid
      if (isPeerValid) {
        log.debug('PEER LOGIN OK', { ip, authorized: true })
        const isPresenter = config.roomPresenters && config.roomPresenters.includes(username).toString()
        const token = encodeToken({ username, password, presenter: isPresenter })
        return res.status(200).json({ message: token })
      } else {
        return res.status(401).json({ message: 'unauthorized' })
      }
    })

    // TODO 认证

    if (config.https === true) {
      const keyPath = path.join(__dirname, './ssl/key.pem')
      const certPath = path.join(__dirname, './ssl/cert.pem')

      if (!fs.existsSync(keyPath)) {
        log.error('SSL key file not found.')
        process.exit(1)
      }

      if (!fs.existsSync(certPath)) {
        log.error('SSL certificate file not found.')
        process.exit(1)
      }

      const options = {
        key: fs.readFileSync(keyPath, 'utf-8'),
        cert: fs.readFileSync(certPath, 'utf-8'),
      }

      this.server = https.createServer(options, app)
    } else {
      this.server = http.createServer(app)
    }
  }

  listen(port: number) {
    this.server.listen(port, undefined, () => {
      log.debug('sign-server started on port:', port)
    })
  }
}

export function useWebServer() {
  return new WebServer()
}
