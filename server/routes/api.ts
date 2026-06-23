import { Request, Response, Router } from 'express'
import { runtime } from '../runtime'
import { SUPPORTED_TYPES } from '../core/protocol-types'
import { localizeParserValue } from '../core/parser-localizer'

const router = Router()
const API_VERSION = '2.0.0'

const PUBLIC_PATHS = new Set([
  '/info',
  '/types',
  '/config',
  '/system/bootstrap',
  '/system/admin/login',
])

function readBearerToken(req: Request) {
  const authorization = req.headers.authorization
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7)
  return undefined
}

function readAdminToken(req: Request) {
  const headerToken = req.headers['x-admin-token']
  if (typeof headerToken === 'string' && headerToken.trim()) return headerToken.trim()
  return readBearerToken(req)
}

function authMiddleware(req: Request, res: Response, next: Function) {
  if (!runtime.config.auth.enabled || PUBLIC_PATHS.has(req.path)) return next()

  const apiKey = (req.headers['x-api-key'] as string | undefined) ?? readBearerToken(req)

  if (!apiKey || !runtime.config.auth.keys.includes(apiKey)) {
    runtime.logger.warn(runtime.i18n.t('logs.authRejected'), { path: req.path, ip: req.ip })
    return res.status(401).json({ error: runtime.i18n.t('errors.invalidApiKey') })
  }

  next()
}

function bootstrapPayload(req?: Request) {
  const session = runtime.adminAuth.verifyToken(readAdminToken(req as Request | undefined))
  return {
    apiVersion: API_VERSION,
    locale: runtime.config.locale,
    admin: {
      username: session?.username ?? runtime.config.admin.username,
      authenticated: Boolean(session),
      expiresAt: session?.expiresAt ?? null,
    },
    logger: {
      level: runtime.config.logger.level,
      file: runtime.logger.getCurrentLogFile(),
      exposeDebugApi: runtime.config.logger.exposeDebugApi,
    },
    site: runtime.config.site,
    theme: runtime.config.theme,
    plugins: runtime.plugins.list(),
  }
}

function requireAdmin(req: Request, res: Response) {
  const token = readAdminToken(req)
  const session = runtime.adminAuth.verifyToken(token)
  if (!session) {
    runtime.logger.warn(runtime.i18n.t('logs.adminRejected'), { path: req.path, ip: req.ip })
    res.status(403).json({ error: runtime.i18n.t('errors.adminRequired') })
    return null
  }
  return session
}

router.use(authMiddleware)

router.get('/info', (_req, res) => {
  res.json({
    name: runtime.i18n.t('api.name'),
    version: API_VERSION,
    protocols: ['IEC 60870-5-104', 'DL/T634.5101-2002'],
    endpoints: {
      'GET /api/v1/info': runtime.i18n.t('api.info'),
      'POST /api/v1/parse': runtime.i18n.t('api.parse'),
      'POST /api/v1/parse/104': runtime.i18n.t('api.parse104'),
      'POST /api/v1/parse/101': runtime.i18n.t('api.parse101'),
      'POST /api/v1/detect': runtime.i18n.t('api.detect'),
      'POST /api/v1/parseLog': runtime.i18n.t('api.parseLog'),
      'GET /api/v1/types': runtime.i18n.t('api.types'),
      'GET /api/v1/system/bootstrap': runtime.i18n.t('api.bootstrap'),
      'GET /api/v1/system/plugins': runtime.i18n.t('api.plugins'),
      'POST /api/v1/system/plugins/:id/config': 'Update plugin config',
      'GET /api/v1/system/logs': runtime.i18n.t('api.logs'),
      'GET /api/v1/system/internal-apis': runtime.i18n.t('api.internalApis'),
    },
    auth: runtime.config.auth.enabled ? 'required (X-API-Key or Bearer)' : 'disabled',
  })
})

router.get('/types', (_req, res) => {
  res.json({ types: localizeParserValue(SUPPORTED_TYPES) })
})

router.get('/config', (_req, res) => {
  res.json({
    site: runtime.config.site,
    locale: runtime.config.locale,
    theme: runtime.config.theme,
  })
})

router.get('/system/bootstrap', (req, res) => {
  res.json(bootstrapPayload(req))
})

router.post('/system/admin/login', (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string }

  if (username !== runtime.config.admin.username || password !== runtime.config.admin.password) {
    runtime.logger.warn(runtime.i18n.t('logs.adminLoginFailed'), { user: username ?? '', ip: req.ip })
    return res.status(401).json({ error: runtime.i18n.t('errors.invalidAdminCredentials') })
  }

  const session = runtime.adminAuth.issueToken(username)
  runtime.logger.info(runtime.i18n.t('logs.adminLoginSucceeded'), { user: username, ip: req.ip })

  res.json({
    ok: true,
    token: session.token,
    username: session.username,
    expiresAt: session.expiresAt,
  })
})

router.get('/system/plugins', (_req, res) => {
  res.json({ plugins: runtime.plugins.list() })
})

router.post('/system/plugins/:id', (req, res) => {
  if (!requireAdmin(req, res)) return

  const { enabled } = req.body as { enabled?: boolean }
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: runtime.i18n.t('errors.invalidPluginState') })
  }

  const plugin = runtime.plugins.getDescriptor(req.params.id)
  if (!plugin) return res.status(404).json({ error: runtime.i18n.t('errors.pluginNotFound') })

  runtime.plugins.setEnabled(plugin.id, enabled)
  runtime.logger.info(runtime.i18n.t('logs.pluginToggled'), { plugin: plugin.id, enabled })

  res.json({
    ok: true,
    plugin: runtime.plugins.list().find((item) => item.id === plugin.id),
  })
})

router.post('/system/plugins/:id/config', (req, res) => {
  if (!requireAdmin(req, res)) return

  const plugin = runtime.plugins.getDescriptor(req.params.id)
  if (!plugin) return res.status(404).json({ error: runtime.i18n.t('errors.pluginNotFound') })

  const config = req.body?.config
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return res.status(400).json({ error: runtime.i18n.t('errors.invalidPluginConfig') })
  }

  try {
    runtime.plugins.setConfig(plugin.id, config)
    runtime.logger.info(runtime.i18n.t('logs.pluginConfigUpdated'), { plugin: plugin.id, keys: Object.keys(config) })

    res.json({
      ok: true,
      plugin: runtime.plugins.list().find((item) => item.id === plugin.id),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    res.status(400).json({ error: message })
  }
})

router.get('/system/logs', (req, res) => {
  const limit = Number(req.query.limit ?? 200)
  res.json({
    file: runtime.logger.getCurrentLogFile(),
    files: runtime.logger.listFiles(),
    lines: runtime.logger.readCurrent(limit),
  })
})

router.post('/system/logs/client', (req, res) => {
  if (!runtime.config.logger.clientMirror) return res.json({ ok: false, mirrored: false })

  const { level, message, meta } = req.body as { level?: string; message?: string; meta?: unknown }
  if (!level || !['error', 'warn', 'info', 'debug'].includes(level)) {
    return res.status(400).json({ error: runtime.i18n.t('errors.invalidClientLogLevel') })
  }

  runtime.logger[level as 'error' | 'warn' | 'info' | 'debug'](
    message || runtime.i18n.t('logs.clientLogAccepted'),
    meta,
    'frontend',
  )

  res.json({ ok: true, mirrored: true })
})

router.get('/system/internal-apis', (_req, res) => {
  res.json({ apis: runtime.internalApis.list() })
})

router.post('/detect', (req, res) => {
  const hexArr = runtime.parser.normalizeHexInput
    ? runtime.parser.normalizeHexInput(req.body.hex)
    : []

  if (!hexArr.length) {
    return res.status(400).json({ error: runtime.i18n.t('errors.missingHex') })
  }

  const results = hexArr.map((hex) => {
    const detected = runtime.parser.detect(hex)
    return { input: hex, protocol: detected.protocol, cleaned: detected.hexData }
  })

  runtime.logger.info(runtime.i18n.t('logs.apiCalled'), { route: '/detect', count: hexArr.length })
  res.json({ success: true, results })
})

router.post('/parse', (req, res) => {
  const hexArr = runtime.parser.normalizeHexInput
    ? runtime.parser.normalizeHexInput(req.body.hex)
    : []

  if (!hexArr.length) {
    return res.status(400).json({ error: runtime.i18n.t('errors.missingHex') })
  }

  const { results, errors } = runtime.parser.parseHexList(hexArr)
  runtime.logger.info(runtime.i18n.t('logs.parseAuto'), { route: '/parse', count: hexArr.length, errors: errors.length })
  res.json({ success: true, frames: results, errors })
})

router.post('/parse/104', (req, res) => {
  const hexArr = runtime.parser.normalizeHexInput
    ? runtime.parser.normalizeHexInput(req.body.hex)
    : []

  if (!hexArr.length) {
    return res.status(400).json({ error: runtime.i18n.t('errors.missingHex') })
  }

  const { results, errors } = runtime.parser.parseHexList(hexArr, '104')
  runtime.logger.info(runtime.i18n.t('logs.parse104'), { route: '/parse/104', count: hexArr.length, errors: errors.length })
  res.json({ success: true, protocol: '104', frames: results, errors })
})

router.post('/parse/101', (req, res) => {
  const hexArr = runtime.parser.normalizeHexInput
    ? runtime.parser.normalizeHexInput(req.body.hex)
    : []

  if (!hexArr.length) {
    return res.status(400).json({ error: runtime.i18n.t('errors.missingHex') })
  }

  const { results, errors } = runtime.parser.parseHexList(hexArr, '101')
  runtime.logger.info(runtime.i18n.t('logs.parse101'), { route: '/parse/101', count: hexArr.length, errors: errors.length })
  res.json({ success: true, protocol: '101', frames: results, errors })
})

router.post('/parseLog', (req, res) => {
  const { logText, forceProtocol } = req.body as { logText?: string; forceProtocol?: string }
  if (typeof logText !== 'string') {
    return res.status(400).json({ error: runtime.i18n.t('errors.invalidLogText') })
  }

  const normalizedForce = forceProtocol === '101' || forceProtocol === '104'
    ? forceProtocol
    : undefined

  const lines = runtime.parser.parseLogText(logText, normalizedForce)
  runtime.logger.info(runtime.i18n.t('logs.parseLog'), {
    route: '/parseLog',
    forceProtocol: normalizedForce ?? 'auto',
    lines: logText.split(/\r?\n/).length,
  })

  res.json({ success: true, lines })
})

export default router
