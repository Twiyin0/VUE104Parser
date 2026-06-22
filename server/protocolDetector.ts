export interface DetectResult {
  protocol: '104' | '101'
  hexData: string
}

function isHexPairString(clean: string) {
  return clean.length > 0 && clean.length % 2 === 0 && /^[0-9a-f]+$/i.test(clean)
}

function isConcatenated101Frames(clean: string) {
  if (!isHexPairString(clean)) return false

  const bytes: number[] = []
  for (let index = 0; index < clean.length; index += 2) {
    bytes.push(parseInt(clean.slice(index, index + 2), 16))
  }

  let offset = 0
  let frameCount = 0

  while (offset < bytes.length) {
    const start = bytes[offset]

    if (start === 0x10) {
      if (offset + 6 > bytes.length) return false
      if (bytes[offset + 5] !== 0x16) return false
      offset += 6
      frameCount += 1
      continue
    }

    if (start === 0x68) {
      if (offset + 6 > bytes.length) return false

      const l1 = bytes[offset + 1]
      const l2 = bytes[offset + 2]
      const start2 = bytes[offset + 3]
      if (l1 !== l2 || start2 !== 0x68) return false

      const frameLength = l1 + 6
      if (offset + frameLength > bytes.length) return false
      if (bytes[offset + frameLength - 1] !== 0x16) return false

      offset += frameLength
      frameCount += 1
      continue
    }

    return false
  }

  return frameCount > 0
}

export function detectProtocol(hexLine: string): DetectResult {
  let line = hexLine.trim()
  let protocol: '104' | '101' | null = null

  const prefixMatch = line.match(/^\[(101|104)\]\s*/i)
  if (prefixMatch) {
    protocol = prefixMatch[1] as '104' | '101'
    line = line.slice(prefixMatch[0].length).trim()
  }
  if (protocol) return { protocol, hexData: line }

  const clean = line.replace(/\s+/g, '')
  if (clean.length < 2) return { protocol: '104', hexData: line }

  if (isConcatenated101Frames(clean)) {
    return { protocol: '101', hexData: line }
  }

  const firstByte = parseInt(clean.slice(0, 2), 16)
  if (firstByte === 0x68) return { protocol: '104', hexData: line }

  return { protocol: '104', hexData: line }
}
