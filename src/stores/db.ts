import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface RawRow {
  Addr?: number | null
  BoardPoint?: number | null
  Name?: string | null
  SwitchPoint?: number | null
  SwitchName?: string | null
  TableName?: string | null
  UpAddr?: number | null
}

export type DbStatus = 'none' | 'loading' | 'ok' | 'err'

export const useDbStore = defineStore('db', () => {
  const status   = ref<DbStatus>('none')
  const pill     = ref('未加载')
  const detail   = ref('')
  const errMsg   = ref('')
  const tableNames = ref<(string | null)[]>([])
  const curTable   = ref<string | null>(null)

  const raw = ref({ yc: [] as RawRow[], yx: [] as RawRow[], yk: [] as RawRow[], en: [] as RawRow[], para: [] as RawRow[] })

  // Derived maps rebuilt on curTable change
  const switchYXPoint = ref(new Map<number, string>())
  const switchYCPoint = ref(new Map<number, string>())
  const switchYKPoint = ref(new Map<number, string>())
  const switchENPoint = ref(new Map<number, string>())
  const allYXPoint    = ref(new Map<number, string>())
  const allYCPoint    = ref(new Map<number, string>())
  const allYKPoint    = ref(new Map<number, string>())
  const allENPoint    = ref(new Map<number, string>())
  const paraMap       = ref(new Map<number, string>())

  const ok = computed(() => status.value === 'ok')

  function rebuildMaps(tableName: string | null) {
    curTable.value = tableName

    const buildAllMap = (rows: RawRow[]) => {
      const m = new Map<number, string>()
      for (const r of rows) {
        const key = r.Addr != null ? Number(r.Addr) : null
        const name = r.Name ? String(r.Name).trim() : ''
        if (key != null && key > 0 && name) m.set(key, name)
      }
      return m
    }

    const buildSwitchMap = (rows: RawRow[]) => {
      const m = new Map<number, string>()
      for (const r of rows) {
            // 如果选择了特定转发表，只包含该表的行
        if (tableName !== null) {
          if ((r.TableName ?? null) !== tableName) continue
        }
        // switch 映射总是用 SwitchPoint 和 SwitchName
        const key = r.SwitchPoint != null ? Number(r.SwitchPoint) : null
        const name = r.SwitchName ? String(r.SwitchName).trim() : ''
        if (key != null && key > 0 && name) m.set(key, name)
      }
      return m
    }

    allYXPoint.value = buildAllMap(raw.value.yx)
    allYCPoint.value = buildAllMap(raw.value.yc)
    allYKPoint.value = buildAllMap(raw.value.yk)
    allENPoint.value = buildAllMap(raw.value.en)

    switchYXPoint.value = buildSwitchMap(raw.value.yx)
    switchYCPoint.value = buildSwitchMap(raw.value.yc)
    switchYKPoint.value = buildSwitchMap(raw.value.yk)
    switchENPoint.value = buildSwitchMap(raw.value.en)

    const pm = new Map<number, string>()
    for (const r of raw.value.para)
      if (r.UpAddr) pm.set(Number(r.UpAddr), String(r.Name ?? '').trim())
    paraMap.value = pm
  }

  /** IOA → 点名。follow101Transfer 仅 fileParser 使用 */
  function ptName(type: string, addr: number | string, proto?: string, follow101Transfer = false): string {
    if (!ok.value) return ''
    const n = Number(addr)
    if (isNaN(n)) return ''
    const is101 = String(proto ?? '').trim() === '101'

    // 计算偏移量
    let offset = 0
    if (type === 'yc') offset = 0x4000
    else if (type === 'yk') offset = 0x6000
    else if (type === 'en') offset = 0x6400
    // yx offset = 0

    // 决定是否使用全点表映射
    const useAllTable = curTable.value === null || (is101 && !follow101Transfer)

    if (type === 'yx') {
      return useAllTable ? (allYXPoint.value.get(n) ?? '') : (switchYXPoint.value.get(n - offset) ?? '')
    }
    if (type === 'yc') {
      return useAllTable ? (allYCPoint.value.get(n) ?? '') : (switchYCPoint.value.get(n - offset) ?? '')
    }
    if (type === 'yk') {
      return useAllTable ? (allYKPoint.value.get(n) ?? '') : (switchYKPoint.value.get(n - offset) ?? '')
    }
    if (type === 'en') {
      return useAllTable ? (allENPoint.value.get(n) ?? '') : (switchENPoint.value.get(n - offset) ?? '')
    }
    if (type === 'para') return paraMap.value.get(n) ?? ''
    return ''
  }

  async function loadDb(file: File) {
    status.value = 'loading'
    pill.value   = '解析中…'
    detail.value = file.name

    try {
      const SQL = await (window as any).initSqlJs({
        locateFile: (f: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${f}`
      })
      const db = new SQL.Database(new Uint8Array(await file.arrayBuffer()))

      const readTable = (sql: string): RawRow[] => {
        try {
          const stmt = db.prepare(sql)
          const rows: RawRow[] = []
          while (stmt.step()) rows.push(stmt.getAsObject())
          stmt.free()
          return rows
        } catch { return [] }
      }

      raw.value.yc   = readTable('SELECT Addr,BoardPoint,Name,SwitchPoint,SwitchName,TableName FROM ProjectYcPoint ORDER BY Addr')
      raw.value.yx   = readTable('SELECT Addr,BoardPoint,Name,SwitchPoint,SwitchName,TableName FROM ProjectYxPoint ORDER BY Addr')
      raw.value.yk   = readTable('SELECT Addr,BoardPoint,Name,SwitchPoint,SwitchName,TableName FROM ProjectYkPoint ORDER BY Addr')
      raw.value.en   = readTable('SELECT Addr,Name,SwitchPoint,SwitchName,TableName FROM ProjectEnergyPoint ORDER BY Addr')
      raw.value.para = readTable('SELECT UpAddr,Name,TableName FROM ProjectParaTransferPoint')
      db.close()

      // Collect table names (只保留非空转发表名)
      const tnSet = new Set<string>()
      for (const arr of [raw.value.yc, raw.value.yx, raw.value.yk, raw.value.en])
        for (const r of arr) {
          const t = r.TableName
          if (t && typeof t === 'string' && t.trim()) tnSet.add(t.trim())
        }
      tableNames.value = [...tnSet].sort((a, b) => String(a).localeCompare(String(b), 'zh'))

      const defaultTable = tableNames.value.find(t => t != null) ?? null
      rebuildMaps(defaultTable)

      const { yc, yx, yk, en, para } = raw.value
      detail.value = `${file.name}  遥测 ${yc.length} · 遥信 ${yx.length} · 遥控 ${yk.length} · 电能量 ${en.length} · 参数 ${para.length} 条`
      pill.value   = '✓ 已加载'
      status.value = 'ok'
      document.body.classList.add('has-db')
    } catch (e: any) {
      status.value = 'err'
      pill.value   = '✗ ' + e.message
      detail.value = file.name
      document.body.classList.remove('has-db')
    }
  }

  function clear() {
    raw.value = { yc: [], yx: [], yk: [], en: [], para: [] }
    tableNames.value = []
    curTable.value   = null
    status.value     = 'none'
    pill.value       = '未加载'
    detail.value     = ''
    switchYXPoint.value = new Map(); switchYCPoint.value = new Map()
    switchYKPoint.value = new Map(); switchENPoint.value = new Map()
    allYXPoint.value = new Map();    allYCPoint.value = new Map()
    allYKPoint.value = new Map();    allENPoint.value = new Map()
    paraMap.value = new Map()
    document.body.classList.remove('has-db')
  }

  return {
    status, pill, detail, errMsg, tableNames, curTable, ok, raw,
    rebuildMaps, ptName, loadDb, clear,
  }
})
