<script setup lang="ts">
import { ref, watch } from 'vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import DbBar from '../components/DbBar.vue'
import { useDbStore } from '../stores/db'
import { esc, addrHex, protoBadge, dirBadge, typeTag, highlightTime } from '../composables/useHtmlUtils'

const db = useDbStore()

const logText     = ref('')
const logFileName = ref('')
const logInput    = ref('')
const parseResult = ref<any>(null)
const outputHtml  = ref('<div class="empty-hint">上传 log 文件后点击「解析 Log」按钮开始</div>')
const statsHtml   = ref('')
const statsVisible = ref(false)
const errorMsg    = ref('')
const showError   = ref(false)
const parseStatus = ref('')
const parsing     = ref(false)
const downloadEnabled = ref(false)
const filterDebug = ref(false)
const follow101   = ref(false)
const forceProto  = ref<'auto'|'104'|'101'>('auto')

// Drop zone state
const dragOver    = ref(false)
const hasFile     = ref(false)
const dropIcon    = ref('📄')
const dropLabel   = ref('点击选择 log 文件，或拖拽到此处')
const dropName    = ref('')

function ptName(type: string, addr: number | string, proto?: string) {
  return db.ptName(type, addr, proto, follow101.value)
}

// 监听点表类型变化，重新渲染结果
watch(() => db.curTable, () => {
  if (parseResult.value) renderResult(parseResult.value)
})

// ── Log file loading ──────────────────────────────────────
function loadLogFile(file: File) {
  logFileName.value = file.name
  const reader = new FileReader()
  reader.onload = ev => {
    logText.value = ev.target!.result as string
    hasFile.value = true
    dropIcon.value  = '✅'
    dropLabel.value = '已加载文件'
    dropName.value  = `${file.name}  (${(file.size / 1024).toFixed(1)} KB)`
    checkEnable()
  }
  reader.readAsText(file, 'utf-8')
}

function checkEnable() {
  // parseBtn enable handled by computed
}

function onDropZoneClick() {
  document.getElementById('logFileInput')?.click()
}

function onDrop(e: DragEvent) {
  e.preventDefault(); dragOver.value = false
  const f = e.dataTransfer?.files[0]; if (f) loadLogFile(f)
}

function onLogFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]; if (f) loadLogFile(f)
}

const parseEnabled = () => logInput.value.trim().length > 0 || logText.value.length > 0

// ── Parse ─────────────────────────────────────────────────
async function parseLog() {
  const text = logInput.value.trim() || logText.value
  if (!text) return
  parsing.value = true
  showError.value = false
  parseStatus.value = ''

  try {
    const resp = await fetch('/parseLog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logText: text, forceProtocol: forceProto.value === 'auto' ? undefined : forceProto.value })
    })
    if (!resp.ok) throw new Error(`Server error ${resp.status}`)
    parseResult.value = await resp.json()
    renderResult(parseResult.value)
    downloadEnabled.value = true
    parseStatus.value = `✓ 解析完成 ${parseResult.value.lines.length} 行`
    setDefaultTable(parseResult.value)
  } catch (e: any) {
    errorMsg.value = '解析失败：' + e.message
    showError.value = true
  } finally {
    parsing.value = false
  }
}

function clearAll() {
  logText.value = ''; logFileName.value = ''; logInput.value = ''; parseResult.value = null
  hasFile.value = false; dropIcon.value = '📄'; dropLabel.value = '点击选择 log 文件，或拖拽到此处'; dropName.value = ''
  downloadEnabled.value = false; statsVisible.value = false; showError.value = false; parseStatus.value = ''
  outputHtml.value = '<div class="empty-hint">上传 log 文件后点击「解析 Log」按钮开始</div>'
  const inp = document.getElementById('logFileInput') as HTMLInputElement | null; if (inp) inp.value = ''
}

// ── Render ────────────────────────────────────────────────
function renderResult(result: any) {
  const lines: any[] = result.lines ?? []
  let nHex = 0, n104 = 0, n101 = 0, nYC = 0, nYX = 0, nCtrl = 0, nFault = 0, nEnergy = 0

  lines.forEach(l => {
    if (l.type !== 'hex') return
    nHex++
    if (l.protocol === '104') n104++; else n101++
    ;(l.frames ?? []).forEach((f: any) => {
      if (f.type === 'yc')                       nYC     += (f.data ?? []).length
      if (f.type === 'yx' || f.type === 'soe')   nYX     += (f.data ?? []).length
      if (f.type === 'control')                  nCtrl   += (f.data ?? []).length
      if (f.type === 'fault')                    nFault++
      if (f.type === 'energy')                   nEnergy += (f.data ?? []).length
    })
  })

  statsHtml.value = `
    <span class="stat-pill lines">总行 ${lines.length}</span>
    <span class="stat-pill proto104">帧 ${nHex} 条</span>
    <span class="stat-pill proto104">104×${n104}</span>
    <span class="stat-pill proto101">101×${n101}</span>
    <span class="stat-pill yc">遥测 ${nYC}</span>
    <span class="stat-pill yx">遥信 ${nYX}</span>
    <span class="stat-pill ctrl">遥控 ${nCtrl}</span>
    <span class="stat-pill fault">故障 ${nFault}</span>
    <span class="stat-pill energy">电能 ${nEnergy}</span>`
  statsVisible.value = true

  const html: string[] = []
  lines.forEach((line, idx) => {
    if (line.type === 'empty') return
    if (line.type === 'debug') {
      html.push(`<div class="debug-line"${filterDebug.value ? ' style="display:none"' : ''}>${highlightTime(esc(line.raw))}</div>`)
      return
    }
    if (line.type === 'hex') {
      const pb  = protoBadge(line.protocol)
      const db2 = dirBadge(line.prefix ?? '')
      const id  = `hb${idx}`
      html.push(`
      <div class="hex-block" id="${id}">
        <div class="hex-header" onclick="toggleBlock('${id}')">
          ${db2}${pb}
          <span class="hex-raw">${highlightTime(esc(line.prefix ?? ''))} <span class="text-slate-400">${esc(line.hexStr ?? '')}</span></span>
          <span class="frame-summary">${summarizeFrames(line.frames ?? [])}</span>
          <span class="hex-chevron">▾</span>
        </div>
        <div class="hex-body">
          <div class="frames-wrap">${renderFrames(line.frames ?? [], line.protocol)}</div>
        </div>
      </div>`)
    }
  })

  outputHtml.value = html.join('') || '<div class="empty-hint">无可显示内容</div>'
}

function summarizeFrames(frames: any[]): string {
  if (!frames.length) return ''
  return frames.map(f => {
    const t = f.type
    if (t === 'yc')      return `遥测×${(f.data??[]).length}`
    if (t === 'yx' || t === 'soe') return `遥信×${(f.data??[]).length}`
    if (t === 'control') return `遥控×${(f.data??[]).length}`
    if (t === 'fault')   return '故障事件'
    if (t === 'energy')  return `电能×${(f.data??[]).length}`
    if (t === 'total_call') return '总召'
    if (t === 'clock')   return '对时'
    if (t === 'link_frame') return '链路帧'
    if (t === 'heartbeat')  return '心跳'
    if (t === 'init')    return '初始化'
    if (t === 'error')   return '⚠解析错误'
    return t
  }).join(' · ')
}

function renderFrames(frames: any[], proto: string): string {
  if (!frames.length) return '<div class="empty-frame-hint">（无可解析帧）</div>'
  return frames.map((f, i) => renderFrame(f, i, proto)).join('')
}

function renderFrame(f: any, idx: number, proto: string): string {
  const cardId = `fc_${idx}_${Math.random().toString(36).slice(2, 6)}`
  const pb  = protoBadge(f.protocol ?? proto)
  const tag = typeTag(f.type)
  if (f.type === 'error') return `<div class="frame-error">⚠ ${esc(f.error)}</div>`

  let body = ''
  if      (f.type === 'yc')                     body = renderYC(f, proto)
  else if (f.type === 'yx' || f.type === 'soe') body = renderYX(f, proto)
  else if (f.type === 'control')                body = renderCtrl(f, proto)
  else if (f.type === 'fault')                  body = renderFault(f, proto)
  else if (f.type === 'energy')                 body = renderEnergy(f, proto)
  else if (f.type === 'link_frame')             body = renderLinkFrame(f)
  else if (f.type === 'param')                  body = renderParam(f, proto)
  else body = `<div class="frame-json">${highlightTime(esc(JSON.stringify(f, null, 2)))}</div>`

  const countStr = f.data ? ` <small class="frame-count">(${f.data.length}条)</small>` : ''
  return `
  <div class="frame-card" id="${cardId}">
    <div class="frame-card-head" onclick="toggleBlock('${cardId}')">
      <span>${pb}${tag}${countStr}</span>
      <span class="hex-chevron">▾</span>
    </div>
    <div class="frame-card-body">
      <div class="frame-table-wrap">${body}</div>
    </div>
  </div>`
}

function renderYC(f: any, proto: string): string {
  const rows = (f.data ?? []).map((item: any, i: number) => {
    const name = ptName('yc', item.addr, proto)
    return `<tr><td>${i+1}</td><td>${item.addr??''}</td><td class="mono">${addrHex(item.addr,proto)}</td>
      <td class="col-name"><span class="${name?'pname':'pname-none'}">${esc(name)||'—'}</span></td>
      <td>${esc(String(item.value??''))}</td><td>${esc(item.quality??item.qds??'')}</td>
      <td>${highlightTime(esc(item.time??item.timestamp??''))}</td></tr>`
  }).join('')
  return `<table><thead><tr><th>#</th><th>地址(dec)</th><th>地址(hex)</th>
    <th class="col-name">点名</th><th>值</th><th>品质</th><th>时标</th>
  </tr></thead><tbody>${rows}</tbody></table>`
}

function renderYX(f: any, proto: string): string {
  const rows = (f.data ?? []).map((item: any, i: number) => {
    const addr = item.addrDec ?? item.addr
    const name = ptName('yx', addr, proto)
    return `<tr><td>${i+1}</td><td>${addr??''}</td><td class="mono">${addrHex(addr,proto)}</td>
      <td class="col-name"><span class="${name?'pname':'pname-none'}">${esc(name)||'—'}</span></td>
      <td>${esc(item.state??'')}</td><td>${highlightTime(esc(item.time??item.timestamp??''))}</td></tr>`
  }).join('')
  return `<table><thead><tr><th>#</th><th>地址(dec)</th><th>地址(hex)</th>
    <th class="col-name">点名</th><th>状态</th><th>时标</th>
  </tr></thead><tbody>${rows}</tbody></table>`
}

function renderFault(f: any, proto: string): string {
  let html = ''
  if ((f.yx ?? []).length) {
    html += '<div class="frame-block-header">📍 遥信</div>'
    const rows = f.yx.map((item: any, i: number) => {
      const name = ptName('yx', item.point, proto)
      return `<tr><td>${i+1}</td><td>${item.point??''}</td><td class="mono">${addrHex(item.point,proto)}</td>
        <td class="col-name"><span class="${name?'pname':'pname-none'}">${esc(name)||'—'}</span></td>
        <td>${esc(item.state??'')}</td><td>${highlightTime(esc(item.time||''))}</td></tr>`
    }).join('')
    html += `<table><thead><tr><th>#</th><th>地址(dec)</th><th>地址(hex)</th><th class="col-name">点名</th><th>状态</th><th>时标</th></tr></thead><tbody>${rows}</tbody></table>`
  }
  if ((f.yc ?? []).length) {
    html += '<div class="frame-block-header">📊 遥测</div>'
    const rows = f.yc.map((item: any, i: number) => {
      const name = ptName('yc', item.addr ?? item.point, proto)
      return `<tr><td>${i+1}</td><td>${item.addr??item.point??''}</td><td class="mono">${addrHex(item.addr??item.point,proto)}</td>
        <td class="col-name"><span class="${name?'pname':'pname-none'}">${esc(name)||'—'}</span></td>
        <td>${esc(String(item.value??''))}</td><td>${highlightTime(esc(item.time??item.timestamp??''))}</td></tr>`
    }).join('')
    html += `<table><thead><tr><th>#</th><th>地址(dec)</th><th>地址(hex)</th><th class="col-name">点名</th><th>值</th><th>时标</th></tr></thead><tbody>${rows}</tbody></table>`
  }
  return html || `<div class="frame-json">${highlightTime(esc(JSON.stringify(f,null,2)))}</div>`
}

function renderCtrl(f: any, proto: string): string {
  const rows = (f.data ?? []).map((item: any, i: number) => {
    const addrDec = parseInt(String(item.addr??'').replace(/^0x/i,''),16)
    const name = ptName('yk', isNaN(addrDec)?item.addr:addrDec, proto)
    return `<tr><td>${i+1}</td><td class="mono">${esc(item.addr??'')}</td>
      <td class="col-name"><span class="${name?'pname':'pname-none'}">${esc(name)||'—'}</span></td>
      <td>${esc(item.state??'')}</td><td>${esc(item.operation??'')}</td><td>${esc(item.return??'')}</td></tr>`
  }).join('')
  return `<table><thead><tr><th>#</th><th>地址</th><th class="col-name">点名</th><th>状态</th><th>操作</th><th>结果</th></tr></thead><tbody>${rows}</tbody></table>`
}

function renderEnergy(f: any, proto: string): string {
  const rows = (f.data ?? []).map((item: any, i: number) => {
    const name = ptName('en', item.addr, proto)
    return `<tr><td>${i+1}</td><td>${item.addr??''}</td><td class="mono">${addrHex(item.addr,proto)}</td>
      <td class="col-name"><span class="${name?'pname':'pname-none'}">${esc(name)||'—'}</span></td>
      <td>${typeof item.value==='number'?item.value.toFixed(3):esc(String(item.value??''))}</td>
      <td>${highlightTime(esc(item.time||''))}</td></tr>`
  }).join('')
  return `<table><thead><tr><th>#</th><th>地址(dec)</th><th>地址(hex)</th><th class="col-name">点名</th><th>值</th><th>时标</th></tr></thead><tbody>${rows}</tbody></table>`
}

function renderParam(f: any, proto: string): string {
  const rows = (f.data ?? []).map((item: any, i: number) => {
    const addrNum = parseInt(String(item.addr??'').replace(/^0x/i,''),16)
    const name = ptName('para', isNaN(addrNum)?item.addr:addrNum, proto)
    return `<tr><td>${i+1}</td><td class="mono">${esc(item.addr??'')}</td>
      <td class="col-name"><span class="${name?'pname':'pname-none'}">${esc(name)||'—'}</span></td>
      <td>${esc(item.operation??'')}</td><td>${esc(String(item.value??''))}</td></tr>`
  }).join('')
  return `<table><thead><tr><th>#</th><th>地址</th><th class="col-name">点名</th><th>操作</th><th>值</th></tr></thead><tbody>${rows}</tbody></table>`
}

function renderLinkFrame(f: any): string {
  return `<div class="link-frame">
    链路地址: ${esc(String(f.linkAddr??'—'))}
    帧类型: ${esc(f.frameType||'—')}
    方向: ${esc(f.ctrl?.direction||'—')}
    功能码: ${esc(String(f.ctrl?.fc??'—'))} ${esc(f.ctrl?.fcName||'')}
    校验: ${f.csValid?'✓':'✗'}
  </div>`
}

function setDefaultTable(result: any) {
  if (!db.ok || !db.tableNames.length) return
  const protos: Record<string,number> = {}
  result.lines.forEach((l: any) => { if (l.type === 'hex' && l.protocol) protos[l.protocol] = (protos[l.protocol] ?? 0) + 1 })
  let mainProto = '', max = 0
  for (const [p, c] of Object.entries(protos)) if (c > max) { max = c; mainProto = p }
  if (!mainProto || db.curTable) return
  const defaultTable = mainProto === '101' ? null
    : (db.tableNames.includes('入网检') ? '入网检' : (db.tableNames[0] ?? null))
  if (defaultTable !== db.curTable) {
    db.rebuildMaps(defaultTable)
    if (parseResult.value) renderResult(parseResult.value)
  }
}

function applyDebugFilter() {
  document.querySelectorAll('#output .debug-line').forEach((el: Element) => {
    (el as HTMLElement).style.display = filterDebug.value ? 'none' : ''
  })
}

function apply101Follow() {
  if (parseResult.value) renderResult(parseResult.value)
}

// ── Download ──────────────────────────────────────────────
function downloadLog() {
  if (!parseResult.value) return
  const lines: any[] = parseResult.value.lines ?? []
  const parts: string[] = []

  lines.forEach(line => {
    if (line.type === 'empty') { parts.push(''); return }
    if (line.type !== 'hex')  { parts.push(line.raw); return }
    parts.push(line.raw)
    const proto = line.protocol || '104'
    parts.push(`  {${proto}}`)

    ;(line.frames ?? []).forEach((f: any) => {
      if (f.type === 'error')      { parts.push(`  [*错误*] ${f.error}`); return }
      if (f.type === 'link_frame') { parts.push(`  [*链路帧*] 地址:${f.linkAddr} ${f.ctrl?.fcName??''}`); return }
      const label: Record<string,string> = {
        yc:'*遥测*',yx:'*遥信*',soe:'*SOE遥信*',control:'*遥控*',
        param:'*定值*',energy:'*电能量*',fault:'*故障事件*',
        clock:'*对时*',total_call:'*总召*',heartbeat:'*心跳*',init:'*初始化*'
      }
      parts.push(`  [${label[f.type]??`*${f.type}*`}]`)

      if (f.type === 'yc') {
        parts.push(`  #\t协议\t地址(dec)\t地址(hex)\t点名\t值\t时标`)
        ;(f.data??[]).forEach((item: any, i: number) => {
          parts.push(`  ${i+1}\t${proto}\t${item.addr??''}\t${addrHex(item.addr,proto)}\t${ptName('yc',item.addr,proto)||'—'}\t${item.value??''}\t${item.time||''}`)
        })
      } else if (f.type === 'yx' || f.type === 'soe') {
        parts.push(`  #\t协议\t地址(dec)\t地址(hex)\t点名\t状态\t触发时间`)
        ;(f.data??[]).forEach((item: any, i: number) => {
          const addr = item.addrDec??item.addr
          parts.push(`  ${i+1}\t${proto}\t${addr??''}\t${addrHex(addr,proto)}\t${ptName('yx',addr,proto)||'—'}\t${item.state??''}\t${item.time||item.timestamp||''}`)
        })
      } else if (f.type === 'control') {
        parts.push(`  #\t协议\t地址\t点名\t状态\t操作\t结果`)
        ;(f.data??[]).forEach((item: any, i: number) => {
          const addrDec = parseInt(String(item.addr||'').replace(/^0x/i,''),16)
          parts.push(`  ${i+1}\t${proto}\t${item.addr??''}\t${ptName('yk',isNaN(addrDec)?item.addr:addrDec,proto)||'—'}\t${item.state??''}\t${item.operation??''}\t${item.return??''}`)
        })
      } else if (f.type === 'energy') {
        parts.push(`  #\t协议\t地址(dec)\t地址(hex)\t点名\t值\t时标`)
        ;(f.data??[]).forEach((item: any, i: number) => {
          const val = typeof item.value === 'number' ? item.value.toFixed(3) : (item.value??'')
          parts.push(`  ${i+1}\t${proto}\t${item.addr??''}\t${addrHex(item.addr,proto)}\t${ptName('en',item.addr,proto)||'—'}\t${val}\t${item.time||''}`)
        })
      } else if (f.type === 'fault') {
        ;(f.yx??[]).forEach((item: any, i: number) => {
          if (i===0) parts.push(`  #\t协议\t地址(dec)\t点名\t状态\t时标  [遥信]`)
          parts.push(`  ${i+1}\t${proto}\t${item.point??''}\t${ptName('yx',item.point,proto)||'—'}\t${item.state??''}\t${item.time||''}`)
        })
        ;(f.yc??[]).forEach((item: any, i: number) => {
          if (i===0) parts.push(`  #\t协议\t地址(dec)\t点名\t值\t时标  [遥测]`)
          parts.push(`  ${i+1}\t${proto}\t${item.addr??item.point??''}\t${ptName('yc',item.addr??item.point,proto)||'—'}\t${item.value??''}\t${item.time||''}`)
        })
      } else { parts.push(`  ${JSON.stringify(f)}`) }
    })
    parts.push('')
  })

  const blob = new Blob([parts.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = (logFileName.value.replace(/\.[^.]+$/, '') || 'parsed') + '_parsed.log'
  a.click(); URL.revokeObjectURL(url)
}

// toggleBlock is called from inline HTML, expose globally
;(window as any).toggleBlock = (id: string) => {
  const el = document.getElementById(id)
  if (!el) return
  const body = el.querySelector<HTMLElement>('.hex-body, .frame-card-body, .fault-body')
  if (!body) return

  const collapsed = el.classList.toggle('collapsed')
  if (collapsed) {
    body.style.maxHeight = '0'
    body.style.opacity = '0'
  } else {
    body.style.maxHeight = body.scrollHeight + 'px'
    body.style.opacity = '1'
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 dark:bg-slate-900 p-5 flex justify-center transition-colors">
    <div class="w-full max-w-[1700px] bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-black/10 p-7">

      <!-- Header -->
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap mb-1.5">
        📄 Log 文件解析器
        <span class="text-xs font-normal bg-blue-600 text-white px-3 py-0.5 rounded-full">104</span>
        <span class="text-xs font-normal bg-cyan-600 text-white px-3 py-0.5 rounded-full">101</span>
        <span class="text-xs font-normal bg-violet-600 text-white px-3 py-0.5 rounded-full">LOG</span>
        <ThemeToggle />
        <router-link to="/"
          class="ml-2 text-sm text-blue-600 dark:text-blue-400 border border-slate-300 dark:border-slate-600 px-3.5 py-1 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          ← 返回实时解析
        </router-link>
      </h1>
      <div class="mb-4 pl-3 border-l-4 border-violet-500 bg-slate-50 dark:bg-slate-700/50 py-2 text-sm text-slate-600 dark:text-slate-300 rounded-r-lg leading-relaxed">
        上传 log 文件后自动逐行解析，保留原始调试信息，识别 <code class="bg-slate-200 dark:bg-slate-600 px-1 rounded text-xs">Tx/Rx</code> 帧并解析 101/104 协议内容。
        可加载点表 db 文件查看点名。支持网页展示或下载解析后的 log 文件。
      </div>

      <!-- DB Bar -->
      <DbBar />

      <!-- Controls Row -->
      <div class="flex gap-3 flex-wrap mb-3">
        <!-- Drop Zone -->
        <div class="log-drop-zone" :class="{ drag: dragOver, 'has-file': hasFile }"
          @click="onDropZoneClick" @dragover.prevent="dragOver=true" @dragleave="dragOver=false" @drop="onDrop">
          <div class="text-3xl mb-1">{{ dropIcon }}</div>
          <div class="text-sm text-slate-500 dark:text-slate-400">{{ dropLabel }}</div>
          <div v-if="dropName" class="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">{{ dropName }}</div>
          <input id="logFileInput" type="file" accept=".log,.txt" class="hidden" @change="onLogFileChange" />
        </div>

        <!-- Protocol Selection -->
        <div class="flex flex-col gap-1.5 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 min-w-[200px]">
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">协议强制模式</div>
          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" v-model="forceProto" value="auto" class="accent-blue-500" /> 🔍 自动识别（推荐）
          </label>
          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" v-model="forceProto" value="104" class="accent-blue-500" /> <span class="proto-104">104</span> 强制 IEC 104
          </label>
          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" v-model="forceProto" value="101" class="accent-blue-500" /> <span class="proto-101">101</span> 强制 IEC 101
          </label>
        </div>
      </div>

      <!-- Log Text Input -->
      <div class="flex flex-col gap-1.5 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 mb-3" style="min-height:30vh">
        <div class="flex items-center gap-4">
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">输入 log 文本解析</div>
          <!-- Toggles -->
          <div class="flex items-center gap-4 ml-auto">
            <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>过滤调试信息</span>
              <label class="toggle-switch">
                <input type="checkbox" v-model="filterDebug" @change="applyDebugFilter" />
                <div class="toggle-track"></div>
                <div class="toggle-thumb"></div>
              </label>
            </div>
            <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>101 转发</span>
              <label class="toggle-switch">
                <input type="checkbox" v-model="follow101" @change="apply101Follow" />
                <div class="toggle-track"></div>
                <div class="toggle-thumb"></div>
              </label>
            </div>
          </div>
        </div>
        <textarea v-model="logInput" placeholder="粘贴一小段 log 文本进行解析（可选，优先于文件）"
          class="flex-1 min-h-[20vh] px-3 py-2 font-mono text-xs border border-slate-300 dark:border-slate-600
                 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 resize-y
                 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <!-- Buttons -->
      <div class="flex items-center gap-3 flex-wrap mb-4">
        <button class="btn btn-primary" :disabled="parsing || !parseEnabled()" @click="parseLog">
          {{ parsing ? '⏳ 解析中...' : '▶ 解析 Log' }}
        </button>
        <button class="btn btn-green" :disabled="!downloadEnabled" @click="downloadLog">⬇ 下载解析结果</button>
        <button class="btn btn-ghost" @click="clearAll">🗑 清空</button>
        <span class="text-xs text-slate-400">{{ parseStatus }}</span>
      </div>

      <!-- Stats -->
      <div class="stats-bar mb-3" :class="{ visible: statsVisible }" v-html="statsHtml" />

      <!-- Error -->
      <div class="error-box" :class="{ show: showError }">{{ errorMsg }}</div>

      <!-- Output -->
      <div id="output" class="space-y-0.5" v-html="outputHtml" />

    </div>
  </div>
</template>
