import type { PluginDescriptor } from './types'
import type { BackendPluginDefinition } from './backend'
import { logCleanerPlugin } from './log-cleaner'

export const builtinPlugins: PluginDescriptor[] = [
  {
    id: 'core.parser',
    name: 'Parser Core',
    description: 'Core IEC 101/104 parser service and internal APIs.',
    scopes: ['backend'],
    category: 'core',
    defaultEnabled: true,
    backend: {
      internalApis: ['parser.detect', 'parser.parse.single', 'parser.parse.log'],
    },
  },
  {
    id: 'core.log-viewer',
    name: 'Log Viewer',
    description: 'Expose backend debug logs to the frontend.',
    scopes: ['frontend', 'backend'],
    category: 'tooling',
    defaultEnabled: true,
    frontend: {
      featureFlags: ['debug-log-viewer'],
    },
    backend: {
      internalApis: ['logger.read.current', 'logger.list.files'],
    },
  },
  {
    id: 'core.db-tools',
    name: 'DB Tools',
    description: 'Enable point table mapping and SQL.js based helpers.',
    scopes: ['frontend'],
    category: 'tooling',
    defaultEnabled: true,
    frontend: {
      featureFlags: ['db-tools'],
    },
  },
  {
    id: 'core.theme-ocean',
    name: 'Ocean Theme',
    description: 'Register the Ocean theme preset.',
    scopes: ['frontend'],
    category: 'theme',
    defaultEnabled: true,
    frontend: {
      themeIds: ['theme-ocean'],
    },
  },
  {
    id: 'core.theme-graphite',
    name: 'Graphite Theme',
    description: 'Register the Graphite theme preset.',
    scopes: ['frontend'],
    category: 'theme',
    defaultEnabled: true,
    frontend: {
      themeIds: ['theme-graphite'],
    },
  },
  logCleanerPlugin.descriptor,
]

export const builtinBackendPlugins: BackendPluginDefinition[] = [
  logCleanerPlugin,
]
