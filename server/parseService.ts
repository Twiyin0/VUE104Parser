import { createRequire } from 'module'
import { detectProtocol } from './protocolDetector.js'

const require = createRequire(import.meta.url)
const Parser104 = require('../src_parsers/104ParserClass.js')
const Parser101 = require('../src_parsers/101ParserClass.js')

const parser104 = new Parser104()
const parser101 = new Parser101()

export const LOG_LINE_RE = /^(.+?(?:Tx\(\d+\)\s*-+>|Rx\(\d+\)\s*<-+))\s+((?:[0-9A-Fa-f]{2}\s*)+)$/

export function normalizeHexInput(hex: unknown): string[] {
  if (typeof hex === 'string') return [hex]
  if (Array.isArray(hex)) return hex.filter((h): h is string => typeof h === 'string')
  return []
}

export function parseSingle(hexStr: string, forceProtocol?: '104' | '101') {
  const det = forceProtocol ? { protocol: forceProtocol, hexData: hexStr } : detectProtocol(hexStr)
  const protocol = det.protocol
  const hexData = det.hexData

  let frames: any[]
  if (protocol === '101') {
    frames = parser101.parse(hexData)
  } else {
    frames = parser104.parse(hexData)
    frames.forEach((frame: any) => {
      if (frame && typeof frame === 'object') frame.protocol = '104'
    })
  }

  return { protocol, hexData, frames }
}

export function parseHexList(hexArr: string[], forceProtocol?: '104' | '101') {
  const results: any[] = []
  const errors: any[] = []

  for (const hex of hexArr) {
    try {
      const { protocol, frames } = parseSingle(hex, forceProtocol)
      results.push(...frames.map((frame: any) => ({ ...frame, protocol })))
    } catch (error: any) {
      errors.push({ input: hex, error: error.message })
    }
  }

  return { results, errors }
}

export function parseLines(lines: string[]) {
  const results: any[] = []

  for (const line of lines) {
    if (!line?.trim()) continue
    try {
      const { frames } = parseSingle(line)
      results.push(...frames)
    } catch (error: any) {
      results.push({ type: 'error', error: error.message, raw: line, protocol: 'unknown' })
    }
  }

  return results
}

export function parseLogText(logText: string, forceProtocol?: '104' | '101') {
  const lines: any[] = []

  for (const rawLine of logText.split(/\r?\n/)) {
    const trimmed = rawLine.trim()
    if (!trimmed) {
      lines.push({ raw: rawLine, type: 'empty' })
      continue
    }

    const match = LOG_LINE_RE.exec(trimmed)
    if (!match) {
      lines.push({ raw: rawLine, type: 'debug' })
      continue
    }

    const prefix = match[1]
    const hexStr = match[2].trim()

    try {
      const { protocol, hexData, frames } = parseSingle(hexStr, forceProtocol)
      lines.push({ raw: rawLine, type: 'hex', prefix, hexStr: hexData, protocol, frames })
    } catch (error: any) {
      lines.push({
        raw: rawLine,
        type: 'hex',
        prefix,
        hexStr,
        protocol: forceProtocol ?? '104',
        frames: [{ type: 'error', error: error.message, protocol: forceProtocol ?? 'unknown' }]
      })
    }
  }

  return lines
}
