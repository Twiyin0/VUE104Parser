<script setup lang="ts">
import { ref } from 'vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import DbBar from '../components/DbBar.vue'
import CollapseSection from '../components/CollapseSection.vue'
import { useDbStore } from '../stores/db'
import { esc, addrHex, protoBadge, nameCell, qdsStr, opClass, ycValueStr } from '../composables/useHtmlUtils'

const db = useDbStore()

const hexInput = ref('')
const errorMsg = ref('')
const showError = ref(false)

// Section refs
const secYc     = ref<InstanceType<typeof CollapseSection>>()
const secYx     = ref<InstanceType<typeof CollapseSection>>()
const secEnergy = ref<InstanceType<typeof CollapseSection>>()
const secCtrl   = ref<InstanceType<typeof CollapseSection>>()
const secParam  = ref<InstanceType<typeof CollapseSection>>()
const secLink   = ref<InstanceType<typeof CollapseSection>>()
const secEvents = ref<InstanceType<typeof CollapseSection>>()

const ycRows      = ref('')
const yxRows      = ref('')
const energyRows  = ref('')
const ctrlRows    = ref('')
const paramRows   = ref('')
const link101Rows = ref('')
const eventLog    = ref('<span class="log-empty">等待解析…</span>')

const counts = ref({ yc: 0, yx: 0, energy: 0, ctrl: 0, param: 0, link101: 0, events: 0 })

async function parse() {
  const lines = hexInput.value.split('\n').map(l => l.trim()).filter(Boolean)
  if (!lines.length) { alert('请输入至少一行报文'); return }

  showError.value = false
  ycRows.value = yxRows.value = energyRows.value = ctrlRows.value = paramRows.value = link101Rows.value = ''
  eventLog.value = '<span class="log-empty">解析中…</span>'
  counts.value = { yc: 0, yx: 0, energy: 0, ctrl: 0, param: 0, link101: 0, events: 0 }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 30000)
  try {
    const resp = await fetch('/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines }),
      signal: ctrl.signal
    })
    clearTimeout(timer)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    renderAll(await resp.json())
  } catch (e: any) {
    clearTimeout(timer)
    errorMsg.value = e.name === 'AbortError' ? '请求超时（30s）' : '请求失败: ' + e.message
    showError.value = true
    eventLog.value = ''
  }
}

function clear() {
  hexInput.value = ''
  ycRows.value = yxRows.value = energyRows.value = ctrlRows.value = paramRows.value = link101Rows.value = ''
  eventLog.value = '<span class="log-empty">等待解析…</span>'
  showError.value = false
  counts.value = { yc: 0, yx: 0, energy: 0, ctrl: 0, param: 0, link101: 0, events: 0 }
  ;[secYc, secYx, secEnergy, secCtrl, secParam, secLink, secEvents].forEach(s => s.value?.close())
}

function renderAll(results: any[]) {
  let ycIdx = 1, yxIdx = 1, ctrlIdx = 1, energyIdx = 1
  const _yc: string[] = [], _yx: string[] = [], _ctrl: string[] = []
  const _param: string[] = [], _energy: string[] = [], _link101: string[] = [], _ev: string[] = []

  for (const frame of results) {
    const proto = frame.protocol || '104'
    const pb    = protoBadge(proto)
    const rowCls = proto === '101' ? 'bg-cyan-50/30 dark:bg-cyan-900/10' : ''

    if (frame.type === 'error') {
      _ev.push(`<div class="ev-item ev-unknown">${pb}<span class="ev-icon">❌</span>${esc(frame.error)}</div>`)
      continue
    }

    if (frame.type === 'link_frame') {
      const li = frame
      const fcbStr = li.ctrl?.fcb != null ? li.ctrl.fcb : '—'
      const fcvStr = li.ctrl?.fcv != null ? li.ctrl.fcv : '—'
      const acdStr = li.ctrl?.acd != null ? (li.ctrl.acd ? '<span class="text-amber-500">1(有数据)</span>' : '0') : '—'
      const dfcStr = li.ctrl?.dfc != null ? (li.ctrl.dfc ? '<span class="text-red-500">1(满载)</span>' : '0') : '—'
      const csStr  = li.csValid ? '<span class="text-emerald-600">✓ 正确</span>' : '<span class="text-red-500">✗ 错误</span>'
      _link101.push(`<tr class="${rowCls}">
        <td class="mono">${li.linkAddr ?? '—'}</td>
        <td>${li.frameType === 'fixed' ? '固定帧' : '可变帧(无ASDU)'}</td>
        <td>${esc(li.ctrl?.direction ?? '—')}</td>
        <td><span class="mono">${li.ctrl?.fc ?? '—'}</span> ${esc(li.ctrl?.fcName ?? '')}</td>
        <td>${fcbStr}</td><td>${fcvStr}</td><td>${acdStr}</td><td>${dfcStr}</td><td>${csStr}</td>
      </tr>`)
      continue
    }

    switch (frame.type) {
      case 'yc':
        for (const item of frame.data ?? []) {
          const name = db.ptName('yc', item.addr, proto)
          _yc.push(`<tr class="${rowCls}">
            <td>${ycIdx++}</td><td>${pb}</td>
            <td>${item.addr ?? ''}</td><td class="mono">${addrHex(item.addr, proto)}</td>
            ${nameCell(name)}
            <td>${ycValueStr(item)}</td>
            <td><span class="type-tag">${esc(item.valueType ?? '')}</span></td>
            <td>${qdsStr(item.qds)}</td>
          </tr>`)
        }
        break

      case 'yx': case 'soe':
        for (const item of frame.data ?? []) {
          const name = db.ptName('yx', item.addrDec ?? item.addr, proto)
          _yx.push(`<tr class="${rowCls}">
            <td>${yxIdx++}</td><td>${pb}</td>
            <td>${item.addrDec ?? item.addr ?? ''}</td><td class="mono">${addrHex(item.addr, proto)}</td>
            ${nameCell(name)}
            <td>${esc(item.state)}</td>
            <td>${esc(item.time ?? '')}</td>
          </tr>`)
        }
        break

      case 'control':
        for (const item of frame.data ?? []) {
          const addrDec = parseInt(String(item.addr).replace(/^0x/i, ''), 16)
          const name    = db.ptName('yk', addrDec, proto)
          const resCls  = item.return === 'success' ? 'result-ok' : item.return === 'failed' ? 'result-fail' : ''
          _ctrl.push(`<tr class="${rowCls}">
            <td>${ctrlIdx++}</td><td>${pb}</td>
            <td class="mono">${esc(item.addr)}</td>
            ${nameCell(name)}
            <td>${esc(item.state)}</td>
            <td class="${opClass(item.operation)}">${esc(item.operation)}${frame.pn ? '<span class="pn-neg">[否定]</span>' : ''}</td>
            <td>${esc(item.qoc ?? '')}</td>
            <td>${esc(item.pointType)}</td>
            <td class="${resCls}">${esc(item.return)}</td>
          </tr>`)
        }
        break

      case 'param':
        for (const p of frame.data ?? []) {
          const operation = p.operation ?? '?', area = p.sn != null ? p.sn : ''
          let addr = p.addr ?? '', dt = p.tag ?? '', val = p.value, piStr = ''
          if (p.piFlags) piStr = `${p.piFlags.se} / ${p.piFlags.cont} / ${p.piFlags.cr}`
          else if (p.pi != null) piStr = `0x${p.pi.toString(16).padStart(2, '0')}`
          if (p.values?.length) val = p.values.map((v: any) => `${v.addr}=${v.value}`).join('; ')
          if (p.addrs?.length) addr = p.addrs.join(', ')
          if (p.current !== undefined) { val = `当前:${p.current} 最小:${p.min} 最大:${p.max}`; addr = '' }
          const displayVal = val == null ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val)
          const addrNum = addr ? parseInt(String(addr).replace(/^0x/i, ''), 16) : NaN
          const name    = isNaN(addrNum) ? '' : db.ptName('para', addrNum, proto)
          let opCls = ''
          if (operation.includes('撤销')) opCls = 'op-cancel'
          else if (operation.includes('预置')) opCls = 'op-select'
          else if (operation.includes('确认')) opCls = 'op-exec'
          else if (operation.includes('请求') || operation.includes('响应') || operation.includes('切换')) opCls = 'op-confirm'
          _param.push(`<tr class="${rowCls}">
            <td>${pb}</td>
            <td class="${opCls}">${esc(operation)}</td>
            <td>${esc(area)}</td>
            <td class="mono">${esc(addr)}</td>
            ${nameCell(name)}
            <td>${esc(dt)}</td>
            <td>${esc(displayVal)}</td>
            <td><small>${esc(piStr)}</small></td>
          </tr>`)
        }
        break

      case 'energy':
        for (const item of frame.data ?? []) {
          const name = db.ptName('en', item.addr, proto)
          _energy.push(`<tr class="${rowCls}">
            <td>${energyIdx++}</td><td>${pb}</td>
            <td>${item.addr ?? ''}</td><td class="mono">${addrHex(item.addr, proto)}</td>
            ${nameCell(name)}
            <td>${typeof item.value === 'number' ? item.value.toFixed(3) : esc(String(item.value ?? ''))}</td>
            <td>${qdsStr(item.qds)}</td>
            <td>${esc(item.time ?? '')}</td>
          </tr>`)
        }
        break

      case 'fault': {
        const bodyLines: string[] = []
        for (const [i, yx] of (frame.yx ?? []).entries()) {
          if (i === 0) bodyLines.push(`📍 遥信信息 (${frame.yx.length}条):`)
          const _n = db.ptName('yx', yx.point, proto)
          bodyLines.push(`  ${i + 1}. 类型:${esc(yx.typeHex)}  点号(dec):${yx.point}${_n ? `  名称:${_n}` : ''}  状态:${esc(yx.state)}(${esc(yx.stateHex)})  时标:${esc(yx.time)}`)
          _yx.push(`<tr class="bg-orange-50/50 dark:bg-orange-900/10">
            <td class="text-orange-500 font-semibold">故障↑${i + 1}</td><td>${pb}</td>
            <td>${yx.point}</td><td class="mono">${addrHex(yx.point, proto)}</td>
            ${nameCell(_n)}<td>${esc(yx.state)}</td><td>${esc(yx.time)}</td>
          </tr>`)
        }
        for (const [i, yc] of (frame.yc ?? []).entries()) {
          if (i === 0) bodyLines.push(`\n📊 遥测信息 (${frame.yc.length}条, 类型:${esc(frame.ycTypeHex)}):`)
          const vd = yc.rawValue !== undefined ? `${yc.value}(raw:${yc.rawValue})` : (typeof yc.value === 'number' ? yc.value.toFixed(4) : yc.value)
          const _n = db.ptName('yc', yc.addr, proto)
          bodyLines.push(`  ${i + 1}. 地址:${esc(yc.hexAddr)}${_n ? `  名称:${_n}` : ''}  值:${vd}  (${esc(yc.valueType)})`)
          _yc.push(`<tr class="bg-orange-50/50 dark:bg-orange-900/10">
            <td class="text-orange-500 font-semibold">故障↑${i + 1}</td><td>${pb}</td>
            <td>${yc.addr}</td><td class="mono">${esc(yc.hexAddr)}</td>
            ${nameCell(_n)}
            <td>${typeof yc.value === 'number' ? yc.value.toFixed(4) : esc(String(yc.value ?? ''))}</td>
            <td><span class="type-tag">${esc(yc.valueType)}</span></td><td>—</td>
          </tr>`)
        }
        if (frame.error) bodyLines.push(`\n⚠️ 解析错误: ${esc(frame.error)}`)
        const faultId = `fault-${Math.random().toString(36).slice(2, 8)}`
        _ev.push(`<div class="fault-card" id="${faultId}">
          <div class="fault-head" onclick="toggleBlock('${faultId}')">
            <span class="fault-title">🔥 故障事件 ${pb} &nbsp; COT=${frame.cot} &nbsp; 公共地址=${frame.addr} &nbsp; (遥信:${(frame.yx ?? []).length}条 / 遥测:${(frame.yc ?? []).length}条)</span>
            <span class="fault-chev">▾</span>
          </div>
          <div class="fault-body">
            <div class="fault-inner">${bodyLines.join('\n') || '（无详细信息）'}</div>
          </div></div>`)
        break
      }

      case 'total_call':
        _ev.push(`<div class="ev-item ev-total">${pb}<span class="ev-icon">📞</span>总召唤
          &nbsp;命令=${esc(frame.command)}
          ${frame.group != null ? '&nbsp;组=' + esc(frame.group) : ''}
          &nbsp;COT=${esc(frame.cotDesc ?? frame.cot)}
          &nbsp;公共地址=${esc(frame.addr)}
          ${frame.pn ? '<span class="pn-neg">[否定]</span>' : ''}
          ${frame.linkInfo ? `&nbsp;<span class="text-blue-400">[链路地址:${frame.linkInfo.linkAddr} ${esc(frame.linkInfo.fcName ?? '')}]</span>` : ''}
        </div>`); break

      case 'clock_sync':
        _ev.push(`<div class="ev-item ev-clock">${pb}<span class="ev-icon">🕐</span>${esc(frame.desc ?? '时钟')}
          &nbsp;公共地址=${esc(frame.addr)}
          ${frame.time ? '&nbsp;时间=' + esc(frame.time) : ''}
          ${frame.pn ? '<span class="pn-neg">[否定]</span>' : ''}
        </div>`); break

      case 'init_end':
        _ev.push(`<div class="ev-item ev-init">${pb}<span class="ev-icon">🔄</span>初始化结束
          &nbsp;原因=${esc(frame.coiDesc ?? '')}
          &nbsp;公共地址=${esc(frame.addr)}
        </div>`); break

      case 'energy_call':
        _ev.push(`<div class="ev-item ev-energy">${pb}<span class="ev-icon">⚡</span>电能量召唤
          &nbsp;${esc(frame.qccDesc ?? '')}
          &nbsp;COT=${esc(frame.cotDesc ?? frame.cot)}
          &nbsp;公共地址=${esc(frame.addr)}
          ${frame.pn ? '<span class="pn-neg">[否定]</span>' : ''}
        </div>`); break

      case 'test_cmd':
        _ev.push(`<div class="ev-item ev-test">${pb}<span class="ev-icon">🧪</span>${esc(frame.desc ?? '测试命令')}
          &nbsp;FBP=${esc(frame.fbpHex ?? '')}
          ${frame.fbpValid ? '<span class="text-lime-500">✓ 55AA正确</span>' : ''}
          &nbsp;公共地址=${esc(frame.addr)}
          ${frame.pn ? '<span class="pn-neg">[否定]</span>' : ''}
        </div>`); break

      case 'reset_process':
        _ev.push(`<div class="ev-item ev-reset">${pb}<span class="ev-icon">🔃</span>${esc(frame.desc ?? '复位进程')}
          &nbsp;${esc(frame.qrpDesc ?? '')}
          &nbsp;公共地址=${esc(frame.addr)}
          ${frame.pn ? '<span class="pn-neg">[否定]</span>' : ''}
        </div>`); break

      case 'file_service': {
        const svcIcon: Record<string, string> = { F_AF_NA:'📢',F_SC_NA:'📥',F_DR_TA:'📂',F_FR_NA:'✅',F_SR_NA:'📑',F_SG_NA:'📦',F_LS_NA:'🏁' }
        const icon = frame.desc?.includes('确认') ? '🤝' : (svcIcon[frame.service] ?? '📁')
        const lines: string[] = []
        if (frame.nof != null) lines.push(`文件类型: ${esc(frame.nofName)} (NOF=${frame.nof})`)
        if (frame.nos != null) lines.push(`节: ${esc(frame.nosName)} (NOS=${frame.nos})`)
        if (frame.lof != null) lines.push(`文件长度: ${frame.lof} 字节`)
        if (frame.los != null) lines.push(`节长度: ${frame.los} 字节`)
        if (frame.scqDesc) lines.push(`操作类型: ${esc(frame.scqDesc)}`)
        if (frame.result)  lines.push(`准备状态: ${esc(frame.result)}`)
        if (frame.lsqDesc) lines.push(`结束标志: ${esc(frame.lsqDesc)}`)
        if (frame.chsHex)  lines.push(`校验和: ${esc(frame.chsHex)}`)
        if (frame.ackType) lines.push(`确认类型: ${esc(frame.ackType)}`)
        if (frame.dataLen != null) { lines.push(`段数据长度: ${frame.dataLen} 字节`); if (frame.dataHex) lines.push(`数据(HEX):\n${esc(frame.dataHex)}`) }
        if (frame.files?.length) { lines.push(`\n文件列表 (${frame.files.length} 个):`); frame.files.forEach((f: any, i: number) => { const cat = f.fileCategory && f.fileCategory !== f.name ? ` [${esc(f.fileCategory)}]` : ''; lines.push(`  ${i+1}. ${esc(f.name)}${cat}  查询:${esc(f.fileTypeName)}  时间:${esc(f.startTime)} ~ ${esc(f.endTime)}`) }) }
        if (frame.subTypeName) lines.push(`查询类型: ${esc(frame.subTypeName)}`)
        if (frame.entries?.length) { lines.push(`\n目录 (${frame.entries.length} 个文件):`); frame.entries.forEach((e: any, i: number) => lines.push(`  ${i+1}. ${esc(e.nofName)} 大小:${e.lof}字节  修改:${esc(e.lastModified)}  状态:${esc(e.status)}`)) }
        lines.push(`公共地址: ${frame.addr}  COT: ${esc(frame.cotDesc ?? frame.cot)}`)
        const faultId = `fault-${Math.random().toString(36).slice(2, 8)}`
        _ev.push(`<div class="fault-card" id="${faultId}"><div class="fault-head" onclick="toggleBlock('${faultId}')"><span class="fault-title text-cyan-300">${pb}${icon} ${esc(frame.service ?? 'FILE')} &nbsp; ${esc(frame.desc)}</span><span class="fault-chev">▾</span></div><div class="fault-body"><div class="fault-inner text-cyan-200">${lines.join('\n')}</div></div></div>`)
        break
      }

      case 'other':
        _ev.push(`<div class="ev-item ev-unknown">${pb}<span class="ev-icon">🔄</span>控制帧/U帧 &nbsp;控制域=${esc(frame.ctrl ?? '')}</div>`); break

      case 'unknown':
        _ev.push(`<div class="ev-item ev-unknown">${pb}<span class="ev-icon">❓</span>未知 TI=${esc(frame.tiHex ?? frame.ti)}
          &nbsp;COT=${esc(frame.cotDesc ?? frame.cot)}
          &nbsp;公共地址=${esc(frame.addr)}
        </div>`); break

      default:
        _ev.push(`<div class="ev-item ev-unknown">${pb}<span class="ev-icon">📄</span>${esc(JSON.stringify(frame))}</div>`)
    }
  }

  const emptyCols = db.ok ? '' : '' // col-name hidden via CSS
  const setBody = (rows: string[], empty: string) =>
    rows.join('') || `<tr><td colspan="99" class="placeholder">${empty}</td></tr>`

  ycRows.value      = setBody(_yc,     '无遥测数据')
  yxRows.value      = setBody(_yx,     '无遥信/SOE数据')
  energyRows.value  = setBody(_energy, '无电能量数据')
  ctrlRows.value    = setBody(_ctrl,   '无遥控报文')
  paramRows.value   = setBody(_param,  '无定值操作')
  link101Rows.value = setBody(_link101,'无101链路帧')
  eventLog.value    = _ev.length ? _ev.join('') : '<span class="log-empty">✨ 无其他事件</span>'

  counts.value = { yc: _yc.length, yx: _yx.length, energy: _energy.length, ctrl: _ctrl.length, param: _param.length, link101: _link101.length, events: _ev.length }

  const secs: [any, number][] = [
    [secYc, counts.value.yc], [secYx, counts.value.yx], [secEnergy, counts.value.energy],
    [secCtrl, counts.value.ctrl], [secParam, counts.value.param],
    [secLink, counts.value.link101], [secEvents, counts.value.events]
  ]
  secs.forEach(([s, c]) => c > 0 ? s.value?.open() : s.value?.close())
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 dark:bg-slate-900 p-5 flex justify-center transition-colors">
    <div class="w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-black/10 p-7">

      <!-- Header -->
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap mb-1.5">
        ⚡ 104/101规约解析器
        <span class="text-xs font-normal bg-blue-600 text-white px-3 py-0.5 rounded-full">104</span>
        <span class="text-xs font-normal bg-cyan-600 text-white px-3 py-0.5 rounded-full">101</span>
        <ThemeToggle />
        <router-link to="/fileParser"
          class="ml-2 text-sm text-blue-600 dark:text-blue-400 border border-slate-300 dark:border-slate-600 px-3.5 py-1 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          📄 Log文件解析
        </router-link>
      </h1>
      <div class="mb-4 pl-3 border-l-4 border-blue-500 bg-slate-50 dark:bg-slate-700/50 py-2 text-sm text-slate-600 dark:text-slate-300 rounded-r-lg leading-relaxed">
        支持 <strong>IEC 60870-5-104</strong> 与 <strong>DL/T634.5101-2002</strong> 双协议同时解析。每行一帧十六进制报文。
        自动识别协议，也可在行首加 <code class="bg-slate-200 dark:bg-slate-600 px-1 rounded text-xs">[101]</code>
        或 <code class="bg-slate-200 dark:bg-slate-600 px-1 rounded text-xs">[104]</code> 手动指定。<br>
        101报文：固定帧 <code class="bg-slate-200 dark:bg-slate-600 px-1 rounded text-xs">10 C A1 A2 CS 16</code>，
        可变帧 <code class="bg-slate-200 dark:bg-slate-600 px-1 rounded text-xs">68 L L 68 C A1 A2 [ASDU] CS 16</code>。
      </div>

      <!-- DB Bar -->
      <DbBar />

      <!-- Input -->
      <div class="relative mb-3">
        <textarea v-model="hexInput" rows="11"
          placeholder="每行一帧，例如：&#10;68 0E 02 00 00 00 64 01 06 00 01 00 00 00 00 14     (104报文)&#10;68 0B 0B 68 53 01 00 64 01 06 00 01 00 00 00 14 16  (101可变帧)&#10;10 49 01 00 4A 16                                   (101固定帧)"
          class="w-full px-3.5 py-3 font-mono text-sm border border-slate-300 dark:border-slate-600
                 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 resize-y
                 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div class="mb-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
        💡 协议自动识别：<code class="bg-slate-200 dark:bg-slate-600 px-1 rounded">68...16</code>(L/L/68H结构) → 101可变帧 |
        <code class="bg-slate-200 dark:bg-slate-600 px-1 rounded">10...16</code>(6字节) → 101固定帧 |
        <code class="bg-slate-200 dark:bg-slate-600 px-1 rounded">68...</code>(无16H结尾) → 104
      </div>

      <div class="flex gap-2.5 mb-6 flex-wrap">
        <button class="btn btn-primary" @click="parse">🔍 解析报文</button>
        <button class="btn btn-ghost"   @click="clear">🗑️ 清空</button>
      </div>

      <div class="error-box" :class="{ show: showError }">{{ errorMsg }}</div>

      <!-- Results grid -->
      <div class="grid grid-cols-1 gap-4">

        <CollapseSection ref="secYc" icon="📊" title="遥测" subtitle="YC · TI=9/11/13" :count="counts.yc">
          <div class="table-wrap">
            <table><thead><tr>
              <th>#</th><th>协议</th><th>地址(dec)</th><th>地址(hex)</th>
              <th class="col-name">点名</th><th>数值</th><th>类型</th><th>品质QDS</th>
            </tr></thead>
            <tbody v-html="ycRows" /></table>
          </div>
        </CollapseSection>

        <CollapseSection ref="secYx" icon="🚦" title="遥信 / SOE" subtitle="YX · TI=1/3/30/31" :count="counts.yx">
          <div class="table-wrap">
            <table><thead><tr>
              <th>#</th><th>协议</th><th>地址(dec)</th><th>地址(hex)</th>
              <th class="col-name">点名</th><th>状态</th><th>触发时间</th>
            </tr></thead>
            <tbody v-html="yxRows" /></table>
          </div>
        </CollapseSection>

        <CollapseSection ref="secEnergy" icon="⚡" title="电能量" subtitle="TI=206/207" :count="counts.energy">
          <div class="table-wrap">
            <table><thead><tr>
              <th>#</th><th>协议</th><th>地址(dec)</th><th>地址(hex)</th>
              <th class="col-name">点名</th><th>数值</th><th>品质QDS</th><th>时标</th>
            </tr></thead>
            <tbody v-html="energyRows" /></table>
          </div>
        </CollapseSection>

        <CollapseSection ref="secCtrl" icon="🎮" title="遥控" subtitle="Control · TI=45/46" :count="counts.ctrl">
          <div class="table-wrap">
            <table><thead><tr>
              <th>#</th><th>协议</th><th>地址(hex)</th>
              <th class="col-name">点名</th><th>命令</th><th>操作</th><th>QOC</th><th>点类型</th><th>结果</th>
            </tr></thead>
            <tbody v-html="ctrlRows" /></table>
          </div>
        </CollapseSection>

        <CollapseSection ref="secParam" icon="⚙️" title="定值读写" subtitle="Parameter · TI=200~203" :count="counts.param">
          <div class="table-wrap">
            <table><thead><tr>
              <th>协议</th><th>操作</th><th>定值区SN</th><th>地址(hex)</th>
              <th class="col-name">点名</th><th>数据类型</th><th>数据值</th><th>PI</th>
            </tr></thead>
            <tbody v-html="paramRows" /></table>
          </div>
        </CollapseSection>

      </div>

      <!-- 101链路层 -->
      <CollapseSection ref="secLink" icon="🔗" title="101链路层帧" subtitle="FT1.2 固定帧 / 无ASDU帧" :count="counts.link101" badge-class="bg-cyan-500" class="mt-4">
        <div class="table-wrap">
          <table><thead><tr>
            <th>链路地址</th><th>帧类型</th><th>方向/PRM</th><th>FC功能码</th>
            <th>FCB</th><th>FCV</th><th>ACD</th><th>DFC</th><th>CS校验</th>
          </tr></thead>
          <tbody v-html="link101Rows" /></table>
        </div>
      </CollapseSection>

      <!-- 其他事件 -->
      <CollapseSection ref="secEvents" icon="📋" title="其他事件" subtitle="总召/故障/时钟/初始化/测试/复位/电能量召唤/未知" :count="counts.events" class="mt-4">
        <div class="log-panel" v-html="eventLog" />
      </CollapseSection>

    </div>
  </div>
</template>
