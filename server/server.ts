import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from './config.js'
import apiRouter from './routes/api.js'
import { parseLines, parseLogText } from './parseService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(express.json({ limit: '10mb' }))

if (config.cors.enabled) {
  app.use((req, res, next) => {
    const origins = config.cors.origins
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
  if (!Array.isArray(lines)) return res.status(400).json({ error: '需要提供 lines 数组' })
  res.json(parseLines(lines))
})

app.post('/parseLog', express.json({ limit: '100mb' }), (req, res) => {
  const { logText, forceProtocol } = req.body as { logText?: string; forceProtocol?: string }
  if (typeof logText !== 'string') return res.status(400).json({ error: 'logText required' })

  const normalizedForce = forceProtocol === '101' || forceProtocol === '104' ? forceProtocol : undefined
  res.json({ lines: parseLogText(logText, normalizedForce) })
})

const PORT = parseInt(process.env.PORT ?? String(config.server.port), 10)
app.listen(PORT, () => {
  console.log(`104/101 双协议解析器运行在 http://localhost:${PORT}`)
  console.log(`API v1 端点: http://localhost:${PORT}/api/v1/info`)
  if (config.auth.enabled) console.log('API Key 认证已启用')
})
