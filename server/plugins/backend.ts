import type { AppConfig } from '../config'
import type { InternalApiRegistry } from '../core/internal-api'
import type { LoggerService } from '../core/logger'
import type { PluginManager } from '../core/plugin-manager'
import type { PluginDescriptor } from './types'

export interface BackendPluginContext {
  config: AppConfig
  logger: LoggerService
  internalApis: InternalApiRegistry
  plugins: PluginManager
}

export interface BackendPluginInstance {
  stop?(): void
}

export interface BackendPluginDefinition {
  descriptor: PluginDescriptor
  create?(context: BackendPluginContext): BackendPluginInstance | void
}
