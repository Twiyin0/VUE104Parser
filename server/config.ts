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
  site: SiteConfig
}

const defaults: AppConfig = {
  server: { port: 33104 },
  cors: { enabled: true, origins: '*' },
  auth: { enabled: false, keys: [] },
  site: { copyright: '© 2025 VUE104Parser', icp: '', icp_url: 'https://beian.miit.gov.cn/', police: '', police_url: 'https://www.beian.gov.cn/' },
}

function deepMerge(target: any, source: any): any {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] ?? {}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

export function loadConfig(): AppConfig {
  const configPath = path.resolve(__dirname, '../config.yml')
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8')
      const parsed = yaml.load(raw) as Partial<AppConfig> ?? {}
      return deepMerge(defaults, parsed) as AppConfig
    }
  } catch (e: any) {
    console.warn(`[config] 读取 config.yml 失败，使用默认配置: ${e.message}`)
  }
  return { ...defaults }
}

export const config = loadConfig()
