import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { detectProtocol } from './protocolDetector.js'

// CommonJS parser classes (keep as-is, no logic change)
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const Parser104 = require('../src_parsers/104ParserClass.js')
const Parser101 = require('../src_parsers/101ParserClass.js')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app       = express()
app.use(express.json({ limit: '10mb' }))

// Serve built Vue frontend
app.use(express.static(path.join(__dirname, '../dist/public')))

const parser104 = new Parser104()
const parser101 = new Parser101()

// ── /parse ────────────────────────────────────────────────
app.post('/parse', (req, res) => {
  const { lines } = req.body as { lines?: string[] }
  if (!Array.isArray(lines)) return res.status(400).json({ error: '需要提供lines数组' })

  const results: any[] = []
  for (const line of lines) {
    if (!line?.trim()) continue
    try {
      const { protocol, hexData } = detectProtocol(line)
      if (protocol === '101') {
        results.push(...parser101.parse(hexData))
      } else {
        const parsed: any[] = parser104.parse(hexData)
        parsed.forEach(p => { if (p && typeof p === 'object') p.protocol = '104' })
        results.push(...parsed)
      }
    } catch (e: any) {
      results.push({ type: 'error', error: e.message, raw: line, protocol: 'unknown' })
    }
  }
  res.json(results)
})

// ── /parseLog ────────────────────────────────────────────
app.post('/parseLog', express.json({ limit: '100mb' }), (req, res) => {
  const { logText, forceProtocol } = req.body as { logText?: string; forceProtocol?: string }
  if (typeof logText !== 'string') return res.status(400).json({ error: 'logText required' })

  const LOG_LINE_RE = /^(.+?(?:Tx\(\d+\)\s*-+>|Rx\(\d+\)\s*<-+))\s+((?:[0-9A-Fa-f]{2}\s*)+)$/
  const result: any[] = []

  for (const rawLine of logText.split(/\r?\n/)) {
    const trimmed = rawLine.trim()
    if (!trimmed) { result.push({ raw: rawLine, type: 'empty' }); continue }

    const m = LOG_LINE_RE.exec(trimmed)
    if (!m) { result.push({ raw: rawLine, type: 'debug' }); continue }

    const prefix = m[1]
    const hexStr = m[2].trim()
    let detectedProto: string, hexData: string

    if (forceProtocol && forceProtocol !== 'auto') {
      detectedProto = forceProtocol; hexData = hexStr
    } else {
      const det = detectProtocol(hexStr)
      detectedProto = det.protocol; hexData = det.hexData
    }

    let frames: any[] = []
    try {
      if (detectedProto === '101') {
        frames = parser101.parse(hexData)
      } else {
        frames = parser104.parse(hexData)
        frames.forEach(p => { if (p && typeof p === 'object') p.protocol = '104' })
      }
    } catch (e: any) {
      frames = [{ type: 'error', error: e.message, protocol: detectedProto }]
    }

    result.push({ raw: rawLine, type: 'hex', prefix, hexStr, protocol: detectedProto, frames })
  }

  res.json({ lines: result })
})

const PORT = parseInt(process.env.PORT ?? '33104', 10)
app.listen(PORT, () => console.log(`104/101 双协议解析器运行在 http://localhost:${PORT}`))
