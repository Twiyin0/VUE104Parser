import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface SiteConfig {
  copyright: string
  icp: string
  icp_url: string
  police: string
  police_url: string
}

export interface AppConfig {
  server: { port: number }
  cors: { enabled: boolean; origins: string | string[] }
  auth: { enabled: boolean; keys: string[] }
  admin: {
    username: string
    password: string
  }
  locale: {
    default: string
    fallback: string
    frontend: string
    backend: string
  }
  logger: {
    level: 1 | 2 | 3 | 4
    dir: string
    exposeDebugApi: boolean
    clientMirror: boolean
  }
  plugins: {
    enabled: string[]
    stateFile: string
  }
  theme: {
    defaultMode: 'system' | 'light' | 'dark'
    defaultTheme: string
  }
  site: SiteConfig
}

const defaults: AppConfig = {
  server: { port: 33104 },
  cors: { enabled: true, origins: '*' },
  auth: { enabled: false, keys: [] },
  admin: {
    username: 'admin',
    password: 'admin',
  },
  locale: {
    default: 'zh-cn',
    fallback: 'en',
    frontend: 'zh-cn',
    backend: 'zh-cn',
  },
  logger: {
    level: 3,
    dir: 'data/log',
    exposeDebugApi: true,
    clientMirror: true,
  },
  plugins: {
    enabled: [
      'core.parser',
      'core.log-viewer',
      'core.theme-ocean',
      'core.theme-graphite',
      'core.db-tools',
    ],
    stateFile: 'data/plugins.json',
  },
  theme: {
    defaultMode: 'system',
    defaultTheme: 'theme-ocean',
  },
  site: {
    copyright: '© 2026 Vue104Parser by Twiyin0',
    icp: '',
    icp_url: 'https://beian.miit.gov.cn/',
    police: '',
    police_url: 'https://www.beian.gov.cn/',
  },
}

function deepMerge<T>(target: T, source: Partial<T>): T {
  const result: Record<string, unknown> = { ...(target as Record<string, unknown>) }

  for (const key of Object.keys(source as object)) {
    const sourceValue = (source as Record<string, unknown>)[key]
    const targetValue = result[key]

    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      )
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue
    }
  }

  return result as T
}

export function loadConfig(): AppConfig {
  const configPath = path.resolve(__dirname, '../config.yml')

  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8')
      const parsed = (yaml.load(raw) as Partial<AppConfig> | undefined) ?? {}
      return deepMerge(defaults, parsed)
    }
  } catch (error: any) {
    console.warn(`[config][warn] failed to read config.yml: ${error.message}`)
  }

  return { ...defaults }
}

export const config = loadConfig()
