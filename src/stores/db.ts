import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

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

const FULL_TABLE_NAME = '\u5168\u70b9\u8868'
const PILL_IDLE = '\u672a\u52a0\u8f7d'
const PILL_LOADING = '\u89e3\u6790\u4e2d...'
const PILL_OK = '\u2713 \u5df2\u52a0\u8f7d'
const PILL_ERR = '\u2717 '

export const useDbStore = defineStore('db', () => {
  const status = ref<DbStatus>('none')
  const pill = ref(PILL_IDLE)
  const detail = ref('')
  const errMsg = ref('')
  const tableNames = ref<(string | null)[]>([])
  const curTable = ref<string | null>(null)

  const raw = ref({
    yc: [] as RawRow[],
    yx: [] as RawRow[],
    yk: [] as RawRow[],
    en: [] as RawRow[],
    para: [] as RawRow[],
  })

  const switchYXPoint = ref(new Map<number, string>())
  const switchYCPoint = ref(new Map<number, string>())
  const switchYKPoint = ref(new Map<number, string>())
  const switchENPoint = ref(new Map<number, string>())
  const allYXPoint = ref(new Map<number, string>())
  const allYCPoint = ref(new Map<number, string>())
  const allYKPoint = ref(new Map<number, string>())
  const allENPoint = ref(new Map<number, string>())
  const paraMap = ref(new Map<number, string>())

  const ok = computed(() => status.value === 'ok')

  function normalizeTableName(value: string | null | undefined) {
    const text = typeof value === 'string' ? value.trim() : ''
    return text || null
  }

  function buildAllMap(rows: RawRow[]) {
    const fallback = new Map<number, string>()
    const nullTable = new Map<number, string>()
    const fullTable = new Map<number, string>()
    const map = new Map<number, string>()

    for (const row of rows) {
      const key = row.Addr != null ? Number(row.Addr) : null
      const name = row.Name ? String(row.Name).trim() : ''
      if (key == null || key < 0 || !name) continue

      const tableName = normalizeTableName(row.TableName)
      if (tableName === FULL_TABLE_NAME) {
        fullTable.set(key, name)
        continue
      }
      if (tableName === null) {
        nullTable.set(key, name)
        continue
      }
      if (!fallback.has(key)) fallback.set(key, name)
    }

    for (const [key, name] of fallback) map.set(key, name)
    for (const [key, name] of nullTable) map.set(key, name)
    for (const [key, name] of fullTable) map.set(key, name)

    return map
  }

  function buildSwitchMap(rows: RawRow[], activeTable: string | null) {
    const map = new Map<number, string>()
    if (activeTable == null || activeTable === FULL_TABLE_NAME) return map

    for (const row of rows) {
      if (normalizeTableName(row.TableName) !== activeTable) continue
      const key = row.SwitchPoint != null ? Number(row.SwitchPoint) : null
      const name = row.SwitchName ? String(row.SwitchName).trim() : ''
      if (key == null || key < 0 || !name) continue
      map.set(key, name)
    }

    return map
  }

  function rebuildMaps(tableName: string | null) {
    const activeTable = normalizeTableName(tableName)
    curTable.value = activeTable

    allYXPoint.value = buildAllMap(raw.value.yx)
    allYCPoint.value = buildAllMap(raw.value.yc)
    allYKPoint.value = buildAllMap(raw.value.yk)
    allENPoint.value = buildAllMap(raw.value.en)

    switchYXPoint.value = buildSwitchMap(raw.value.yx, activeTable)
    switchYCPoint.value = buildSwitchMap(raw.value.yc, activeTable)
    switchYKPoint.value = buildSwitchMap(raw.value.yk, activeTable)
    switchENPoint.value = buildSwitchMap(raw.value.en, activeTable)

    const nextParaMap = new Map<number, string>()
    for (const row of raw.value.para) {
      const key = row.UpAddr != null ? Number(row.UpAddr) : null
      const name = row.Name ? String(row.Name).trim() : ''
      if (key == null || key < 0 || !name) continue
      nextParaMap.set(key, name)
    }
    paraMap.value = nextParaMap
  }

  function ptName(type: string, addr: number | string, proto?: string, follow101Transfer = true): string {
    if (!ok.value) return ''

    const value = Number(addr)
    if (isNaN(value)) return ''

    const is101 = String(proto ?? '').trim() === '101'
    let offset = 0
    if (type === 'yc') offset = 0x4000
    else if (type === 'yk') offset = 0x6000
    else if (type === 'en') offset = 0x6400

    const useAllTable =
      curTable.value === null ||
      curTable.value === FULL_TABLE_NAME ||
      (is101 && !follow101Transfer)

    if (type === 'yx') {
      return useAllTable ? (allYXPoint.value.get(value) ?? '') : (switchYXPoint.value.get(value - offset) ?? '')
    }
    if (type === 'yc') {
      return useAllTable ? (allYCPoint.value.get(value) ?? '') : (switchYCPoint.value.get(value - offset) ?? '')
    }
    if (type === 'yk') {
      return useAllTable ? (allYKPoint.value.get(value) ?? '') : (switchYKPoint.value.get(value - offset) ?? '')
    }
    if (type === 'en') {
      return useAllTable ? (allENPoint.value.get(value) ?? '') : (switchENPoint.value.get(value - offset) ?? '')
    }
    if (type === 'para') return paraMap.value.get(value) ?? ''
    return ''
  }

  async function loadDb(file: File) {
    status.value = 'loading'
    pill.value = PILL_LOADING
    detail.value = file.name
    errMsg.value = ''

    try {
      const SQL = await (window as any).initSqlJs({
        locateFile: (filename: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${filename}`,
      })
      const db = new SQL.Database(new Uint8Array(await file.arrayBuffer()))

      const readTable = (sql: string): RawRow[] => {
        try {
          const stmt = db.prepare(sql)
          const rows: RawRow[] = []
          while (stmt.step()) rows.push(stmt.getAsObject())
          stmt.free()
          return rows
        } catch {
          return []
        }
      }

      raw.value.yc = readTable('SELECT Addr,BoardPoint,Name,SwitchPoint,SwitchName,TableName FROM ProjectYcPoint ORDER BY Addr')
      raw.value.yx = readTable('SELECT Addr,BoardPoint,Name,SwitchPoint,SwitchName,TableName FROM ProjectYxPoint ORDER BY Addr')
      raw.value.yk = readTable('SELECT Addr,BoardPoint,Name,SwitchPoint,SwitchName,TableName FROM ProjectYkPoint ORDER BY Addr')
      raw.value.en = readTable('SELECT Addr,Name,SwitchPoint,SwitchName,TableName FROM ProjectEnergyPoint ORDER BY Addr')
      raw.value.para = readTable('SELECT UpAddr,Name,TableName FROM ProjectParaTransferPoint')
      db.close()

      const nextTableNames = new Set<string>()
      for (const rows of [raw.value.yc, raw.value.yx, raw.value.yk, raw.value.en]) {
        for (const row of rows) {
          const tableName = normalizeTableName(row.TableName)
          if (tableName) nextTableNames.add(tableName)
        }
      }

      tableNames.value = [...nextTableNames].sort((left, right) => String(left).localeCompare(String(right), 'zh'))
      rebuildMaps(null)

      const { yc, yx, yk, en, para } = raw.value
      detail.value = `${file.name}  YC ${yc.length} | YX ${yx.length} | YK ${yk.length} | EN ${en.length} | PARA ${para.length}`
      pill.value = PILL_OK
      status.value = 'ok'
      document.body.classList.add('has-db')
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error ?? 'Unknown error')
      status.value = 'err'
      pill.value = PILL_ERR + message
      detail.value = file.name
      errMsg.value = message
      document.body.classList.remove('has-db')
    }
  }

  function clear() {
    raw.value = { yc: [], yx: [], yk: [], en: [], para: [] }
    tableNames.value = []
    curTable.value = null
    status.value = 'none'
    pill.value = PILL_IDLE
    detail.value = ''
    errMsg.value = ''
    switchYXPoint.value = new Map()
    switchYCPoint.value = new Map()
    switchYKPoint.value = new Map()
    switchENPoint.value = new Map()
    allYXPoint.value = new Map()
    allYCPoint.value = new Map()
    allYKPoint.value = new Map()
    allENPoint.value = new Map()
    paraMap.value = new Map()
    document.body.classList.remove('has-db')
  }

  return {
    status,
    pill,
    detail,
    errMsg,
    tableNames,
    curTable,
    ok,
    raw,
    rebuildMaps,
    ptName,
    loadDb,
    clear,
  }
})
