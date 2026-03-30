<script setup lang="ts">
import { computed } from 'vue'
import { useDbStore } from '../stores/db'

const db = useDbStore()

const selValue = computed({
  get: () => db.curTable ?? '__null__',
  set: (v) => {
    if (v === '__null__' || v === '') return db.rebuildMaps(null)
    db.rebuildMaps(v)
  }
})

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) db.loadDb(file);
  (e.target as HTMLInputElement).value = ''
}
</script>

<template>
  <div class="db-bar" :class="db.status">
    <span class="db-label flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
      🗄️ 点表数据库
    </span>
    <span class="db-pill" :class="db.status">{{ db.pill }}</span>

    <label class="db-file-btn" for="dbFileInput">📂 选择 .db 文件</label>
    <input id="dbFileInput" type="file" accept=".db,.sqlite,.sqlite3" class="hidden" @change="onFileChange" />

    <span class="db-detail flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-slate-400">
      {{ db.detail }}
    </span>

    <!-- 点表类型选择 -->
    <span class="table-sel-wrap">
      <span class="text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">📋 点表类型</span>
      <select v-model="selValue"
        class="px-2 py-1 rounded-lg text-xs border border-emerald-300 dark:border-emerald-700
               bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer outline-none
               focus:border-emerald-400">
        <option value="__null__">全点表（TableName=null）</option>
        <option v-for="tn in db.tableNames" :key="String(tn ?? '__null__')" :value="tn ?? '__null__'">
          {{ tn ?? '入网检（TableName=入网检）' }}
        </option>
      </select>
    </span>

    <button class="db-clear" @click="db.clear()">✕ 移除</button>
  </div>
</template>
