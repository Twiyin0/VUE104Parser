import fs from 'fs'
import path from 'path'
import type { BackendPluginDefinition } from './backend'

const DEFAULT_INTERVAL_HOURS = 6
const DEFAULT_KEEP_DAYS = 14
const LOG_SUFFIX = '.log'

function cleanupLogs(
  logDir: string,
  currentLogFile: string,
  keepDays: number,
  logger: { info: (message: string, meta?: unknown) => void; warn: (message: string, meta?: unknown) => void },
) {
  const resolvedDir = path.resolve(logDir)
  const activeFile = path.resolve(currentLogFile)

  if (!fs.existsSync(resolvedDir)) return

  const expireBefore = Date.now() - keepDays * 24 * 60 * 60 * 1000
  let deleted = 0

  for (const entry of fs.readdirSync(resolvedDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(LOG_SUFFIX)) continue

    const filePath = path.join(resolvedDir, entry.name)
    if (path.resolve(filePath) === activeFile) continue

    try {
      const stats = fs.statSync(filePath)
      if (stats.mtimeMs >= expireBefore) continue
      fs.unlinkSync(filePath)
      deleted += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.warn('log cleaner failed to remove file', { file: filePath, error: message })
    }
  }

  logger.info('log cleaner finished cleanup pass', {
    dir: resolvedDir,
    deleted,
    keepDays,
  })
}

export const logCleanerPlugin: BackendPluginDefinition = {
  descriptor: {
    id: 'example.log-cleaner',
    name: 'Log Cleaner Example',
    description: 'Example backend plugin that periodically removes expired log files.',
    scopes: ['backend'],
    category: 'tooling',
    defaultEnabled: false,
    backend: {
      configFields: [
        {
          key: 'keepDays',
          label: 'Keep days',
          description: 'Delete log files older than this number of days.',
          type: 'number',
          default: DEFAULT_KEEP_DAYS,
          min: 1,
          max: 365,
          step: 1,
        },
        {
          key: 'intervalHours',
          label: 'Cleanup interval (hours)',
          description: 'How often the cleanup task should run.',
          type: 'number',
          default: DEFAULT_INTERVAL_HOURS,
          min: 1,
          max: 168,
          step: 1,
        },
      ],
    },
  },
  create(context) {
    const config = context.plugins.getConfig('example.log-cleaner')
    const keepDays = Number(config.keepDays ?? DEFAULT_KEEP_DAYS)
    const intervalHours = Number(config.intervalHours ?? DEFAULT_INTERVAL_HOURS)
    const intervalMs = intervalHours * 60 * 60 * 1000

    const run = () => cleanupLogs(context.config.logger.dir, context.logger.getCurrentLogFile(), keepDays, context.logger)

    run()
    const timer = setInterval(run, intervalMs)

    context.logger.info('log cleaner plugin started', {
      intervalMs,
      intervalHours,
      keepDays,
    })

    return {
      stop() {
        clearInterval(timer)
        context.logger.info('log cleaner plugin stopped')
      },
    }
  },
}
