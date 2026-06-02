import { Router, Request, Response } from 'express'
import { createRequire } from 'module'
import { detectProtocol } from '../protocolDetector.js'
import { config } from '../config.js'

const require = createRequire(import.meta.url)
const Parser104 = require('../../src_parsers/104ParserClass.js')
const Parser101 = require('../../src_parsers/101ParserClass.js')

const parser104 = new Parser104()
const parser101 = new Parser101()

const router = Router()

// ── 版本信息 ──────────────────────────────────────────────────
const API_VERSION = '1.0.0'

// ── 支持的帧类型定义 ──────────────────────────────────────────
const SUPPORTED_TYPES = [
  { ti: '1', name: 'M_SP_NA_1', desc: '单点遥信', protocol: ['104', '101'] },
  { ti: '3', name: 'M_DP_NA_1', desc: '双点遥信', protocol: ['104', '101'] },
  { ti: '5', name: 'M_BO_NA_1', desc: '32比特串', protocol: ['104', '101'] },
  { ti: '7', name: 'M_BO_TA_1', desc: '带时标32比特串', protocol: ['104', '101'] },
  { ti: '9', name: 'M_ME_NA_1', desc: '归一化遥测值', protocol: ['104', '101'] },
  { ti: '11', name: 'M_ME_NB_1', desc: '标度化遥测值', protocol: ['104', '101'] },
  { ti: '13', name: 'M_ME_NC_1', desc: '短浮点遥测值', protocol: ['104', '101'] },
  { ti: '30', name: 'M_SP_TB_1', desc: '带时标单点遥信(SOE)', protocol: ['104', '101'] },
  { ti: '31', name: 'M_DP_TB_1', desc: '带时标双点遥信(SOE)', protocol: ['104', '101'] },
  { ti: '45', name: 'C_SC_NA_1', desc: '单命令遥控', protocol: ['104', '101'] },
  { ti: '46', name: 'C_DC_NA_1', desc: '双命令遥控', protocol: ['104', '101'] },
  { ti: '70', name: 'M_EI_NA_1', desc: '初始化结束', protocol: ['104', '101'] },
  { ti: '100', name: 'C_IC_NA_1', desc: '总召唤命令', protocol: ['104', '101'] },
  { ti: '101', name: 'C_CI_NA_1', desc: '电能量召唤命令', protocol: ['104', '101'] },
  { ti: '103', name: 'C_CS_NA_1', desc: '时钟同步/读取', protocol: ['104', '101'] },
  { ti: '104', name: 'C_TS_NA_1', desc: '测试命令', protocol: ['104', '101'] },
  { ti: '105', name: 'C_RP_NA_1', desc: '复位进程', protocol: ['104', '101'] },
  { ti: '200', name: 'P_ME_NA_1', desc: '定值预置/执行(归一化)', protocol: ['104', '101'] },
  { ti: '201', name: 'P_ME_NB_1', desc: '定值预置/执行(标度化)', protocol: ['104', '101'] },
  { ti: '202', name: 'P_ME_NC_1', desc: '定值预置/执行(短浮点)', protocol: ['104', '101'] },
  { ti: '203', name: 'P_AC_NA_1', desc: '定值激活', protocol: ['104', '101'] },
  { ti: '206', name: 'M_ME_ND_1', desc: '累计量短浮点数', protocol: ['104', '101'] },
  { ti: '207', name: 'M_ME_TD_1', desc: '带时标累计量短浮点数', protocol: ['104', '101'] },
  { ti: '210', name: 'F_XX_XX', desc: '文件服务(私有扩展)', protocol: ['104', '101'] },
]

// ── 工具函数 ──────────────────────────────────────────────────

function normalizeHexInput(hex: unknown): string[] {
  if (typeof hex === 'string') return [hex]
  if (Array.isArray(hex)) return hex.filter((h): h is string => typeof h === 'string')
  return []
}

function parseSingle(hexStr: string, forceProtocol?: '104' | '101') {
  let protocol: '104' | '101'
  let hexData: string

  if (forceProtocol) {
    protocol = forceProtocol
    hexData = hexStr
  } else {
    const det = detectProtocol(hexStr)
    protocol = det.protocol
    hexData = det.hexData
  }

  let frames: any[]
  if (protocol === '101') {
    frames = parser101.parse(hexData)
  } else {
    frames = parser104.parse(hexData)
    frames.forEach((p: any) => { if (p && typeof p === 'object') p.protocol = '104' })
  }

  return { protocol, frames }
}

// ── API Key 认证中间件 ────────────────────────────────────────

function authMiddleware(req: Request, res: Response, next: Function) {
  if (!config.auth.enabled) return next()

  // /api/v1/info、/api/v1/types、/api/v1/config 不需要认证
  if (req.path === '/info' || req.path === '/types' || req.path === '/config') return next()

  const apiKey = req.headers['x-api-key'] as string
    ?? (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined)

  if (!apiKey || !config.auth.keys.includes(apiKey)) {
    return res.status(401).json({ error: 'Invalid or missing API Key' })
  }
  next()
}

router.use(authMiddleware)

// ── GET /api/v1/info ──────────────────────────────────────────

router.get('/info', (_req, res) => {
  res.json({
    name: 'IEC 104/101 Parser API',
    version: API_VERSION,
    protocols: ['IEC 60870-5-104', 'DL/T634.5101-2002'],
    endpoints: {
      'GET /api/v1/info': 'API 信息及版本',
      'POST /api/v1/parse': '自动识别协议解析 hex 报文',
      'POST /api/v1/parse/104': '强制按 IEC 104 解析',
      'POST /api/v1/parse/101': '强制按 IEC 101 解析',
      'POST /api/v1/detect': '仅检测协议类型',
      'POST /api/v1/parseLog': '解析含 Tx/Rx 前缀的日志文本',
      'GET /api/v1/types': '支持的帧类型列表',
    },
    auth: config.auth.enabled ? 'required (X-API-Key header)' : 'disabled',
  })
})

// ── GET /api/v1/types ─────────────────────────────────────────

router.get('/types', (_req, res) => {
  res.json({ types: SUPPORTED_TYPES })
})

// ── GET /api/v1/config ────────────────────────────────────────

router.get('/config', (_req, res) => {
  res.json({ site: config.site })
})

// ── POST /api/v1/detect ───────────────────────────────────────

router.post('/detect', (req, res) => {
  const hexArr = normalizeHexInput(req.body.hex)
  if (!hexArr.length) return res.status(400).json({ error: '需要提供 hex 字符串或数组' })

  const results = hexArr.map(hex => {
    const det = detectProtocol(hex)
    return { input: hex, protocol: det.protocol, cleaned: det.hexData }
  })

  res.json({ success: true, results })
})

// ── POST /api/v1/parse ────────────────────────────────────────

router.post('/parse', (req, res) => {
  const hexArr = normalizeHexInput(req.body.hex)
  if (!hexArr.length) return res.status(400).json({ error: '需要提供 hex 字符串或数组' })

  const results: any[] = []
  const errors: any[] = []

  for (const hex of hexArr) {
    try {
      const { protocol, frames } = parseSingle(hex)
      results.push(...frames.map((f: any) => ({ ...f, protocol })))
    } catch (e: any) {
      errors.push({ input: hex, error: e.message })
    }
  }

  res.json({ success: true, frames: results, errors })
})

// ── POST /api/v1/parse/104 ────────────────────────────────────

router.post('/parse/104', (req, res) => {
  const hexArr = normalizeHexInput(req.body.hex)
  if (!hexArr.length) return res.status(400).json({ error: '需要提供 hex 字符串或数组' })

  const results: any[] = []
  const errors: any[] = []

  for (const hex of hexArr) {
    try {
      const { protocol, frames } = parseSingle(hex, '104')
      results.push(...frames.map((f: any) => ({ ...f, protocol })))
    } catch (e: any) {
      errors.push({ input: hex, error: e.message })
    }
  }

  res.json({ success: true, protocol: '104', frames: results, errors })
})

// ── POST /api/v1/parse/101 ────────────────────────────────────

router.post('/parse/101', (req, res) => {
  const hexArr = normalizeHexInput(req.body.hex)
  if (!hexArr.length) return res.status(400).json({ error: '需要提供 hex 字符串或数组' })

  const results: any[] = []
  const errors: any[] = []

  for (const hex of hexArr) {
    try {
      const { protocol, frames } = parseSingle(hex, '101')
      results.push(...frames.map((f: any) => ({ ...f, protocol })))
    } catch (e: any) {
      errors.push({ input: hex, error: e.message })
    }
  }

  res.json({ success: true, protocol: '101', frames: results, errors })
})

// ── POST /api/v1/parseLog ─────────────────────────────────────

const LOG_LINE_RE = /^(.+?(?:Tx\(\d+\)\s*-+>|Rx\(\d+\)\s*<-+))\s+((?:[0-9A-Fa-f]{2}\s*)+)$/

router.post('/parseLog', (req, res) => {
  const { logText, forceProtocol } = req.body as { logText?: string; forceProtocol?: string }
  if (typeof logText !== 'string') return res.status(400).json({ error: 'logText 必须为字符串' })

  const lines: any[] = []

  for (const rawLine of logText.split(/\r?\n/)) {
    const trimmed = rawLine.trim()
    if (!trimmed) { lines.push({ raw: rawLine, type: 'empty' }); continue }

    const m = LOG_LINE_RE.exec(trimmed)
    if (!m) { lines.push({ raw: rawLine, type: 'debug' }); continue }

    const prefix = m[1]
    const hexStr = m[2].trim()
    let detectedProto: string
    let hexData: string

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
        frames.forEach((p: any) => { if (p && typeof p === 'object') p.protocol = '104' })
      }
    } catch (e: any) {
      frames = [{ type: 'error', error: e.message, protocol: detectedProto }]
    }

    lines.push({ raw: rawLine, type: 'hex', prefix, hexStr, protocol: detectedProto, frames })
  }

  res.json({ success: true, lines })
})

export default router
