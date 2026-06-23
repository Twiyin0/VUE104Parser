/** HTML 转义 */
export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function htmlIcon(name: string, cls = '', label = ''): string {
  const className = ['app-icon', cls].filter(Boolean).join(' ')
  const attrs = label
    ? ` role="img" aria-label="${esc(label)}"`
    : ' aria-hidden="true"'
  return `<span class="${className}" style="--icon-url:url(/iconLib/${esc(name)}.svg)"${attrs}></span>`
}

/** 地址十六进制显示 */
export function addrHex(addr: unknown, proto?: string): string {
  const n = Number(addr) || 0
  return proto === '101'
    ? `0x${n.toString(16).padStart(4, '0')}`
    : `0x${n.toString(16).padStart(6, '0')}`
}

/** 协议徽章 HTML */
export function protoBadge(p: string): string {
  return p === '101'
    ? '<span class="proto-101">101</span>'
    : '<span class="proto-104">104</span>'
}

/** 点名 `<td>` 单元格 */
export function nameCell(name: string): string {
  if (!name) return `<td class="col-name"><span class="pname-none">—</span></td>`
  return `<td class="col-name"><span class="pname" title="${esc(name)}">${esc(name)}</span></td>`
}

/** QDS 品质描述 */
export function qdsStr(qds: number | null | undefined): string {
  if (qds == null) return ''
  const hex = `<span class="mono">0x${qds.toString(16).padStart(2, '0')}</span>`
  const cls = qds & 0x10 ? 'qds-bad' : ''
  const bits: string[] = []

  if (qds & 0x01) bits.push('溢出')
  if (qds & 0x04) bits.push('被封锁')
  if (qds & 0x08) bits.push('被取代')
  if (qds & 0x10) bits.push('无效')
  if (qds & 0x20) bits.push('非当前')

  return bits.length ? `<span class="${cls}">${hex} (${bits.join('/')})</span>` : hex
}

/** 遥控操作 CSS 类 */
export function opClass(op: string | undefined): string {
  if (!op) return ''
  if (op.includes('撤销') || op.includes('否定')) return 'op-cancel'
  if (op.includes('选择') || op.includes('预置')) return 'op-select'
  if (op.includes('执行')) return 'op-exec'
  if (op.includes('确认')) return 'op-confirm'
  return ''
}

/** 遥测值显示 */
export function ycValueStr(item: any): string {
  if (item.value && typeof item.value === 'object' && item.value.eng !== undefined) {
    return `${item.value.eng} <span class="mono" title="原始整数">(raw:${item.value.raw})</span>`
  }
  if (typeof item.value === 'number') return String(item.value)
  return esc(String(item.value ?? ''))
}

/** 方向徽章（FileParser 专用） */
export function dirBadge(prefix: string): string {
  if (!prefix) return ''
  if (/Tx/i.test(prefix)) return '<span class="dir-tx">Tx</span>'
  if (/Rx/i.test(prefix)) return '<span class="dir-rx">Rx</span>'
  return ''
}

/** 类型标签（FileParser 专用） */
export function typeTag(type: string): string {
  const label: Record<string, string> = {
    yc: '遥测',
    yx: '遥信',
    soe: 'SOE',
    control: '遥控',
    param: '定值',
    energy: '电能',
    fault: '故障',
    total_call: '总召',
    clock_sync: '对时',
    init_end: '初始化',
    energy_call: '电能量召唤',
    link_frame: '链路帧',
    file_service: '文件',
    reset_process: '复位',
    test_cmd: '测试',
    bitstring: '比特串',
    other: '其他',
    unknown: '未知',
    clock: '对时',
    init: '初始化',
    file: '文件',
    reset: '复位',
    test: '测试',
    heartbeat: '心跳'
  }

  const cls: Record<string, string> = {
    yc: 'yc',
    yx: 'yx',
    soe: 'yx',
    control: 'ctrl',
    param: 'ctrl',
    energy: 'energy',
    fault: 'fault',
    total_call: 'total',
    clock_sync: 'clock',
    init_end: 'total',
    energy_call: 'energy',
    link_frame: 'link',
    file_service: 'other',
    reset_process: 'other',
    test_cmd: 'test',
    bitstring: 'other',
    other: 'other',
    unknown: 'other',
    clock: 'clock',
    init: 'total',
    file: 'other',
    reset: 'other',
    test: 'test',
    heartbeat: 'test'
  }

  return `<span class="type-tag-${cls[type] ?? 'other'}">${esc(label[type] ?? type ?? '?')}</span>`
}

/** 时间戳高亮（FileParser 专用） */
export function highlightTime(escapedStr: string): string {
  return escapedStr.replace(
    /(\d{4}[\/\-]\d{2}[\/\-]\d{2}[-\s]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?|\d{2}:\d{2}:\d{2}(?:[.,]\d+)?)/g,
    '<span class="time-hl">$1</span>'
  )
}
