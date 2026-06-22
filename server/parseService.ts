import { detectProtocol } from './protocolDetector'
import Parser104 from '../src_parsers/104ParserClass'
import Parser101 from '../src_parsers/101ParserClass'
import { localizeParserValue } from './core/parser-localizer'

const parser104 = new Parser104()
const parser101 = new Parser101()

export const LOG_LINE_RE = /^(.+?(?:Tx\(\d+\)\s*-+>|Rx\(\d+\)\s*<-+))\s+((?:[0-9A-Fa-f]{2}\s*)+)$/

export function normalizeHexInput(hex: unknown): string[] {
  if (typeof hex === 'string') return [hex]
  if (Array.isArray(hex)) return hex.filter((item): item is string => typeof item === 'string')
  return []
}

export class ParserService {
  normalizeHexInput(hex: unknown) {
    return normalizeHexInput(hex)
  }

  detect(hexLine: string) {
    return detectProtocol(hexLine)
  }

  parseSingle(hexStr: string, forceProtocol?: '104' | '101') {
    const detected = forceProtocol ? { protocol: forceProtocol, hexData: hexStr } : detectProtocol(hexStr)
    const protocol = detected.protocol
    const hexData = detected.hexData

    let frames: any[]
    if (protocol === '101') {
      frames = parser101.parse(hexData)
    } else {
      frames = parser104.parse(hexData)
      frames.forEach((frame: any) => {
        if (frame && typeof frame === 'object') frame.protocol = '104'
      })
    }

    return { protocol, hexData, frames: localizeParserValue(frames) }
  }

  parseHexList(hexArr: string[], forceProtocol?: '104' | '101') {
    const results: any[] = []
    const errors: any[] = []

    for (const hex of hexArr) {
      try {
        const { protocol, frames } = this.parseSingle(hex, forceProtocol)
        results.push(...frames.map((frame: any) => ({ ...frame, protocol })))
      } catch (error: any) {
        errors.push(localizeParserValue({ input: hex, error: error.message }))
      }
    }

    return { results, errors }
  }

  parseLines(lines: string[]) {
    const results: any[] = []

    for (const line of lines) {
      if (!line?.trim()) continue
      try {
        const { frames } = this.parseSingle(line)
        results.push(...frames)
      } catch (error: any) {
        results.push(localizeParserValue({ type: 'error', error: error.message, raw: line, protocol: 'unknown' }))
      }
    }

    return results
  }

  parseLogText(logText: string, forceProtocol?: '104' | '101') {
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
        const { protocol, hexData, frames } = this.parseSingle(hexStr, forceProtocol)
        lines.push(localizeParserValue({ raw: rawLine, type: 'hex', prefix, hexStr: hexData, protocol, frames }))
      } catch (error: any) {
        lines.push(localizeParserValue({
          raw: rawLine,
          type: 'hex',
          prefix,
          hexStr,
          protocol: forceProtocol ?? '104',
          frames: [{ type: 'error', error: error.message, protocol: forceProtocol ?? 'unknown' }],
        }))
      }
    }

    return lines
  }
}

export const parserService = new ParserService()
export const parseSingle = parserService.parseSingle.bind(parserService)
export const parseHexList = parserService.parseHexList.bind(parserService)
export const parseLines = parserService.parseLines.bind(parserService)
export const parseLogText = parserService.parseLogText.bind(parserService)
