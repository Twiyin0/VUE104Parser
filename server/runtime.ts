import { config } from './config'
import { I18nService } from './core/i18n'
import { backendI18n } from './core/backend-i18n'
import { BackendPluginHost } from './core/backend-plugin-host'
import { InternalApiRegistry } from './core/internal-api'
import { LoggerService } from './core/logger'
import { PluginManager } from './core/plugin-manager'
import { builtinBackendPlugins, builtinPlugins } from './plugins/builtin'
import { parserService } from './parseService'

export interface AppRuntime {
  config: typeof config
  i18n: I18nService
  logger: LoggerService
  internalApis: InternalApiRegistry
  plugins: PluginManager
  parser: typeof parserService
}

const logger = new LoggerService(config.logger.dir, config.logger.level)
const internalApis = new InternalApiRegistry()
const plugins = new PluginManager(config.plugins.stateFile, config.plugins.enabled, builtinPlugins)

internalApis.register('parser.detect', parserService.detect.bind(parserService))
internalApis.register('parser.parse.single', parserService.parseSingle.bind(parserService))
internalApis.register('parser.parse.log', parserService.parseLogText.bind(parserService))
internalApis.register('logger.read.current', logger.readCurrent.bind(logger))
internalApis.register('logger.list.files', logger.listFiles.bind(logger))
internalApis.register('plugins.list', plugins.list.bind(plugins))

export const runtime: AppRuntime = {
  config,
  i18n: backendI18n,
  logger,
  internalApis,
  plugins,
  parser: parserService,
}

const backendPluginHost = new BackendPluginHost(
  {
    config,
    logger,
    internalApis,
    plugins,
  },
  plugins,
  builtinBackendPlugins,
)

backendPluginHost.start()
