import fs from 'fs'
import path from 'path'

export type LogLevel = 'error' | 'warn' | 'info' | 'debug'
export type LogScope = 'backend' | 'frontend'

const levelValue: Record<LogLevel, 1 | 2 | 3 | 4> = {
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
}

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function formatDateParts(date = new Date()) {
  const year = date.getFullYear()
  const month = pad2(date.getMonth() + 1)
  const day = pad2(date.getDate())
  const hour = pad2(date.getHours())
  const minute = pad2(date.getMinutes())
  const second = pad2(date.getSeconds())
  return {
    fileDate: `${year}${month}${day}`,
    timestamp: `${year}-${month}-${day} ${hour}:${minute}:${second}`,
  }
}

export class LoggerService {
  private readonly threshold: number
  private readonly logDir: string
  private readonly currentLogFile: string

  constructor(logDir: string, threshold: number) {
    this.threshold = threshold
    this.logDir = path.resolve(logDir)
    fs.mkdirSync(this.logDir, { recursive: true })
    this.currentLogFile = this.createNextLogFile()
  }

  error(message: string, meta?: unknown, scope: LogScope = 'backend') {
    this.write('error', scope, message, meta)
  }

  warn(message: string, meta?: unknown, scope: LogScope = 'backend') {
    this.write('warn', scope, message, meta)
  }

  info(message: string, meta?: unknown, scope: LogScope = 'backend') {
    this.write('info', scope, message, meta)
  }

  debug(message: string, meta?: unknown, scope: LogScope = 'backend') {
    this.write('debug', scope, message, meta)
  }

  getCurrentLogFile() {
    return this.currentLogFile
  }

  readCurrent(limit = 200) {
    try {
      const lines = fs.readFileSync(this.currentLogFile, 'utf-8').split(/\r?\n/).filter(Boolean)
      return lines.slice(-Math.max(1, Math.min(limit, 2000)))
    } catch {
      return []
    }
  }

  listFiles() {
    if (!fs.existsSync(this.logDir)) return []
    return fs.readdirSync(this.logDir)
      .filter((name) => name.endsWith('.log'))
      .sort()
      .reverse()
    }

  private write(level: LogLevel, scope: LogScope, message: string, meta?: unknown) {
    if (levelValue[level] > this.threshold) return

    const { timestamp } = formatDateParts()
    const suffix = meta === undefined ? '' : ` ${JSON.stringify(meta)}`
    const line = `[${scope}][${level}]${timestamp}: ${message}${suffix}`
    fs.appendFileSync(this.currentLogFile, `${line}\n`, 'utf-8')

    if (level === 'error') console.error(line)
    else if (level === 'warn') console.warn(line)
    else console.log(line)
  }

  private createNextLogFile() {
    const { fileDate } = formatDateParts()
    const pattern = new RegExp(`^${fileDate}_(\\d+)\\.log$`)
    const existing = fs.existsSync(this.logDir) ? fs.readdirSync(this.logDir) : []
    const currentNumber = existing
      .map((file) => pattern.exec(file)?.[1])
      .filter((value): value is string => Boolean(value))
      .map((value) => Number(value))
      .reduce((max, value) => Math.max(max, value), 0)

    const nextNumber = currentNumber + 1
    const filePath = path.join(this.logDir, `${fileDate}_${nextNumber}.log`)
    fs.writeFileSync(filePath, '', 'utf-8')
    return filePath
  }
}
