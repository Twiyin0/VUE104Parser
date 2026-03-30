// protocolDetector.ts
// 自动识别报文属于 IEC 104 还是 IEC 101（逻辑完全不变）

export interface DetectResult {
  protocol: '104' | '101'
  hexData: string
}

export function detectProtocol(hexLine: string): DetectResult {
  let line     = hexLine.trim()
  let protocol: '104' | '101' | null = null

  // 1. 手动标注前缀
  const prefixMatch = line.match(/^\[(101|104)\]\s*/i)
  if (prefixMatch) {
    protocol = prefixMatch[1] as '104' | '101'
    line     = line.slice(prefixMatch[0].length).trim()
  }
  if (protocol) return { protocol, hexData: line }

  // 2. 自动识别
  const clean = line.replace(/\s+/g, '')
  if (clean.length < 2) return { protocol: '104', hexData: line }

  const firstByte = parseInt(clean.slice(0, 2), 16)
  const lastByte  = parseInt(clean.slice(-2), 16)

  // 101 固定帧: 10H 开头，16H 结尾，恰好 6 字节
  if (firstByte === 0x10 && lastByte === 0x16 && clean.length === 12)
    return { protocol: '101', hexData: line }

  // 101 可变帧: 68H 开头，16H 结尾，第4字节 68H，两 L 字节相同
  if (firstByte === 0x68 && lastByte === 0x16 && clean.length >= 16) {
    const L1    = parseInt(clean.slice(2, 4), 16)
    const L2    = parseInt(clean.slice(4, 6), 16)
    const byte4 = parseInt(clean.slice(6, 8), 16)
    if (L1 === L2 && byte4 === 0x68 && clean.length === (L1 + 6) * 2)
      return { protocol: '101', hexData: line }
  }

  // 104: 68H 开头，无 16H 结尾
  if (firstByte === 0x68) return { protocol: '104', hexData: line }

  return { protocol: '104', hexData: line }
}
