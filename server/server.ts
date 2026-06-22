import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import apiRouter from './routes/api'
import { runtime } from './runtime'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(express.json({ limit: '10mb' }))

if (runtime.config.cors.enabled) {
  app.use((req, res, next) => {
    const origins = runtime.config.cors.origins
    const origin = Array.isArray(origins) ? origins.join(', ') : origins
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })
}

app.use(express.static(path.join(__dirname, '../dist/public')))
app.use('/api/v1', apiRouter)

app.post('/parse', (req, res) => {
  const { lines } = req.body as { lines?: string[] }
  if (!Array.isArray(lines)) {
    return res.status(400).json({ error: runtime.i18n.t('errors.invalidLines') })
  }

  const results = runtime.parser.parseLines(lines)
  runtime.logger.info(runtime.i18n.t('logs.apiCalled'), { route: '/parse', lines: lines.length })
  res.json(results)
})

app.post('/parseLog', express.json({ limit: '100mb' }), (req, res) => {
  const { logText, forceProtocol } = req.body as { logText?: string; forceProtocol?: string }
  if (typeof logText !== 'string') {
    return res.status(400).json({ error: runtime.i18n.t('errors.invalidLogText') })
  }

  const normalizedForce = forceProtocol === '101' || forceProtocol === '104'
    ? forceProtocol
    : undefined

  runtime.logger.info(runtime.i18n.t('logs.apiCalled'), {
    route: '/parseLog',
    forceProtocol: normalizedForce ?? 'auto',
  })

  res.json({ lines: runtime.parser.parseLogText(logText, normalizedForce) })
})

const port = parseInt(process.env.PORT ?? String(runtime.config.server.port), 10)
app.listen(port, () => {
  runtime.logger.info(runtime.i18n.t('logs.serverStarted'), {
    url: `http://localhost:${port}`,
    api: `http://localhost:${port}/api/v1/info`,
    logFile: runtime.logger.getCurrentLogFile(),
  })
})
