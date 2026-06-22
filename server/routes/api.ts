import { Router, Request, Response } from 'express'
import { config } from '../config.js'
import { detectProtocol } from '../protocolDetector.js'
import { normalizeHexInput, parseHexList, parseLogText } from '../parseService.js'

const router = Router()
const API_VERSION = '1.0.1'
const HEX_REQUIRED_MSG = '需要提供 hex 字符串或数组'
const LOG_TEXT_REQUIRED_MSG = 'logText 必须为字符串'

const PUBLIC_PATHS = new Set(['/info', '/types', '/config'])

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
  { ti: '120', name: 'F_AF_NA_1', desc: '文件准备就绪', protocol: ['104'] },
  { ti: '121', name: 'F_SC_NA_1', desc: '文件选择/目录请求', protocol: ['104'] },
  { ti: '122', name: 'F_DR_TA_1', desc: '目录传输', protocol: ['104'] },
  { ti: '123', name: 'F_FR_NA_1', desc: '文件传输准备就绪', protocol: ['104'] },
  { ti: '124', name: 'F_SR_NA_1', desc: '节传输准备就绪', protocol: ['104'] },
  { ti: '125', name: 'F_SG_NA_1', desc: '段传输', protocol: ['104'] },
  { ti: '126', name: 'F_LS_NA_1', desc: '最后段/最后节', protocol: ['104'] },
  { ti: '127', name: 'F_AF_NA_1', desc: '文件传输确认', protocol: ['104'] },
  { ti: '200', name: 'P_ME_NA_1', desc: '定值预置/执行(归一化)', protocol: ['104', '101'] },
  { ti: '201', name: 'P_ME_NB_1', desc: '定值预置/执行(标度化)', protocol: ['104', '101'] },
  { ti: '202', name: 'P_ME_NC_1', desc: '定值预置/执行(短浮点)', protocol: ['104', '101'] },
  { ti: '203', name: 'P_AC_NA_1', desc: '定值激活', protocol: ['104', '101'] },
  { ti: '206', name: 'M_ME_ND_1', desc: '累计量短浮点数', protocol: ['104', '101'] },
  { ti: '207', name: 'M_ME_TD_1', desc: '带时标累计量短浮点数', protocol: ['104', '101'] },
  { ti: '210', name: 'F_XX_XX', desc: '文件服务(私有扩展)', protocol: ['104', '101'] }
]

function authMiddleware(req: Request, res: Response, next: Function) {
  if (!config.auth.enabled || PUBLIC_PATHS.has(req.path)) return next()

  const apiKey = req.headers['x-api-key'] as string
    ?? (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined)

  if (!apiKey || !config.auth.keys.includes(apiKey)) {
    return res.status(401).json({ error: 'Invalid or missing API Key' })
  }

  next()
}

router.use(authMiddleware)

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
      'GET /api/v1/types': '支持的帧类型列表'
    },
    auth: config.auth.enabled ? 'required (X-API-Key header)' : 'disabled'
  })
})

router.get('/types', (_req, res) => {
  res.json({ types: SUPPORTED_TYPES })
})

router.get('/config', (_req, res) => {
  res.json({ site: config.site })
})

router.post('/detect', (req, res) => {
  const hexArr = normalizeHexInput(req.body.hex)
  if (!hexArr.length) return res.status(400).json({ error: HEX_REQUIRED_MSG })

  const results = hexArr.map((hex) => {
    const det = detectProtocol(hex)
    return {
      input: hex,
      protocol: det.protocol,
      cleaned: det.hexData
    }
  })

  res.json({ success: true, results })
})

router.post('/parse', (req, res) => {
  const hexArr = normalizeHexInput(req.body.hex)
  if (!hexArr.length) return res.status(400).json({ error: HEX_REQUIRED_MSG })

  const { results, errors } = parseHexList(hexArr)
  res.json({ success: true, frames: results, errors })
})

router.post('/parse/104', (req, res) => {
  const hexArr = normalizeHexInput(req.body.hex)
  if (!hexArr.length) return res.status(400).json({ error: HEX_REQUIRED_MSG })

  const { results, errors } = parseHexList(hexArr, '104')
  res.json({ success: true, protocol: '104', frames: results, errors })
})

router.post('/parse/101', (req, res) => {
  const hexArr = normalizeHexInput(req.body.hex)
  if (!hexArr.length) return res.status(400).json({ error: HEX_REQUIRED_MSG })

  const { results, errors } = parseHexList(hexArr, '101')
  res.json({ success: true, protocol: '101', frames: results, errors })
})

router.post('/parseLog', (req, res) => {
  const { logText, forceProtocol } = req.body as { logText?: string; forceProtocol?: string }
  if (typeof logText !== 'string') return res.status(400).json({ error: LOG_TEXT_REQUIRED_MSG })

  const normalizedForce = forceProtocol === '101' || forceProtocol === '104' ? forceProtocol : undefined
  res.json({ success: true, lines: parseLogText(logText, normalizedForce) })
})

export default router
