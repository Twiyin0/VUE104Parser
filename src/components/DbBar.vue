<script setup lang="ts">
import { computed } from 'vue'
import { useDbStore } from '../stores/db'
import { useI18n } from '../composables/useI18n'

const db = useDbStore()
const { t } = useI18n()

const selValue = computed({
  get: () => db.curTable ?? '__null__',
  set: (value) => {
    if (value === '__null__' || value === '') return db.rebuildMaps(null)
    db.rebuildMaps(value)
  },
})

function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) db.loadDb(file)
  ;(event.target as HTMLInputElement).value = ''
}
</script>

<template>
  <div class="db-bar" :class="db.status">
    <span class="db-label flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
      {{ t('db.title', 'Point Table DB') }}
    </span>
    <span class="db-pill" :class="db.status">{{ db.pill }}</span>

    <label class="db-file-btn" for="dbFileInput">{{ t('db.choose', 'Choose .db file') }}</label>
    <input id="dbFileInput" type="file" accept=".db,.sqlite,.sqlite3" class="hidden" @change="onFileChange" />

    <span class="db-detail flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-slate-400">
      {{ db.detail }}
    </span>

    <span class="table-sel-wrap">
      <span class="text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">{{ t('db.mode', 'Point Table Mode') }}</span>
      <select v-model="selValue" class="app-select app-select-sm">
        <option value="__null__">{{ t('db.all', 'All points (Full/null priority)') }}</option>
        <option v-for="tn in db.tableNames" :key="String(tn ?? '__null__')" :value="tn ?? '__null__'">
          {{ tn ?? t('db.all', 'All points (Full/null priority)') }}
        </option>
      </select>
    </span>

    <button class="db-clear" @click="db.clear()">{{ t('db.remove', 'Remove') }}</button>
  </div>
</template>
