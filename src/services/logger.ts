export type ClientLogLevel = 'error' | 'warn' | 'info' | 'debug'

async function mirror(level: ClientLogLevel, message: string, meta?: unknown) {
  try {
    await fetch('/api/v1/system/logs/client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, message, meta }),
    })
  } catch {
    // Keep the frontend resilient when the debug endpoint is unavailable.
  }
}

export const clientLogger = {
  error(message: string, meta?: unknown) {
    console.error(message, meta)
    return mirror('error', message, meta)
  },
  warn(message: string, meta?: unknown) {
    console.warn(message, meta)
    return mirror('warn', message, meta)
  },
  info(message: string, meta?: unknown) {
    console.info(message, meta)
    return mirror('info', message, meta)
  },
  debug(message: string, meta?: unknown) {
    console.debug(message, meta)
    return mirror('debug', message, meta)
  },
}
