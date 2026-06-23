import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { literalLocaleOverrides } from './parser-literal-overrides'

type Primitive = string | number | boolean | null | undefined
type Dictionary = Record<string, string | Dictionary>

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const fallbackMessages: Dictionary = {
  common: {
    ok: 'OK',
    enabled: 'enabled',
    disabled: 'disabled',
  },
  errors: {
    missingHex: 'hex string or array is required',
    invalidLogText: 'logText must be a string',
    invalidLines: 'lines must be an array',
    invalidPluginState: 'enabled must be a boolean',
    invalidPluginConfig: 'config must be an object',
    pluginNotFound: 'plugin not found',
    invalidClientLogLevel: 'invalid client log level',
    invalidApiKey: 'invalid or missing API key',
    adminRequired: 'admin login required',
    invalidAdminCredentials: 'invalid admin username or password',
  },
  api: {
    name: 'IEC 104/101 Parser API',
    info: 'API information and version',
    parse: 'Auto detect protocol and parse hex frames',
    parse104: 'Force IEC 104 parsing',
    parse101: 'Force IEC 101 parsing',
    detect: 'Detect protocol only',
    parseLog: 'Parse log text with Tx/Rx prefix',
    types: 'Supported frame types',
    config: 'Frontend bootstrap config',
    bootstrap: 'Runtime bootstrap payload',
    plugins: 'Plugin management',
    logs: 'Debug log stream',
    internalApis: 'Internal API registry',
  },
  logs: {
    serverStarted: 'parser server started',
    apiCalled: 'api invoked',
    pluginToggled: 'plugin toggled',
    pluginConfigUpdated: 'plugin config updated',
    clientLogAccepted: 'client log accepted',
    parse104: 'parsed IEC 104 payload',
    parse101: 'parsed IEC 101 payload',
    parseAuto: 'parsed protocol payload',
    parseLog: 'parsed log payload',
    authRejected: 'auth rejected request',
    adminRejected: 'admin permission rejected',
    adminLoginFailed: 'admin login failed',
    adminLoginSucceeded: 'admin login succeeded',
  },
  literals: {},
}

function getByPath(source: Dictionary, key: string): string | undefined {
  const parts = key.split('.')
  let current: string | Dictionary | undefined = source

  for (const part of parts) {
    if (!current || typeof current === 'string') return undefined
    current = current[part]
  }

  return typeof current === 'string' ? current : undefined
}

function fill(template: string, params?: Record<string, Primitive>) {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_match, key) => String(params[key] ?? ''))
}

export class I18nService {
  private readonly locale: string
  private readonly fallbackLocale: string
  private readonly localizedMessages: Dictionary
  private readonly fallbackLocaleMessages: Dictionary

  constructor(locale: string, fallbackLocale = 'en') {
    this.locale = locale
    this.fallbackLocale = fallbackLocale
    this.localizedMessages = this.loadLocale(locale)
    this.fallbackLocaleMessages = locale === fallbackLocale ? this.localizedMessages : this.loadLocale(fallbackLocale)
  }

  t(key: string, params?: Record<string, Primitive>) {
    const localized = getByPath(this.localizedMessages, key)
    if (localized) return fill(localized, params)

    const localeFallback = getByPath(this.fallbackLocaleMessages, key)
    if (localeFallback) return fill(localeFallback, params)

    const fallback = getByPath(fallbackMessages, key)
    if (fallback) return fill(fallback, params)

    return `${this.fallbackLocale}:${key}`
  }

  translateLiteral(value: string, params?: Record<string, Primitive>) {
    const localizedOverride = literalLocaleOverrides[this.locale]?.[value]
    if (localizedOverride) return fill(localizedOverride, params)

    const localizedGroup = this.localizedMessages.literals
    if (localizedGroup && typeof localizedGroup !== 'string') {
      const localized = localizedGroup[value]
      if (typeof localized === 'string') return fill(localized, params)
    }

    const fallbackOverride = literalLocaleOverrides[this.fallbackLocale]?.[value]
    if (fallbackOverride) return fill(fallbackOverride, params)

    const localeFallbackGroup = this.fallbackLocaleMessages.literals
    if (localeFallbackGroup && typeof localeFallbackGroup !== 'string') {
      const localeFallback = localeFallbackGroup[value]
      if (typeof localeFallback === 'string') return fill(localeFallback, params)
    }

    const fallbackGroup = fallbackMessages.literals
    if (fallbackGroup && typeof fallbackGroup !== 'string') {
      const fallback = fallbackGroup[value]
      if (typeof fallback === 'string') return fill(fallback, params)
    }

    return value
  }

  getLocale() {
    return this.locale
  }

  private loadLocale(locale: string): Dictionary {
    const filePath = path.resolve(__dirname, `../i18n/${locale}.json`)
    try {
      if (!fs.existsSync(filePath)) return {}
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Dictionary
    } catch {
      return {}
    }
  }
}
