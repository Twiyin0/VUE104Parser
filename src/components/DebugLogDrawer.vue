<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRuntimeStore } from '../stores/runtime'
import { useI18n } from '../composables/useI18n'

type ParsedLogLine = {
  raw: string
  scopePrefix: string
  levelPrefix: string
  time: string
  message: string
  level: 'error' | 'warn' | 'info' | 'debug' | 'plain'
  scope: 'frontend' | 'backend' | 'plain'
}

const runtime = useRuntimeStore()
const { logDrawerOpen, logLines, currentLogFile } = storeToRefs(runtime)
const { t } = useI18n()

const LOG_PATTERN = /^(\[(frontend|backend)\])(\[(error|warn|info|debug)\])([0-9-]+\s[0-9:]+):\s(.*)$/

const parsedLogLines = computed<ParsedLogLine[]>(() =>
  logLines.value.map((line) => parseLogLine(line)),
)

watch(logDrawerOpen, (open) => {
  if (open) void runtime.refreshLogs()
})

onMounted(() => {
  if (logDrawerOpen.value) void runtime.refreshLogs()
})

function parseLogLine(line: string): ParsedLogLine {
  const match = LOG_PATTERN.exec(line)
  if (!match) {
    return {
      raw: line,
      scopePrefix: '',
      levelPrefix: '',
      time: '',
      message: line,
      level: 'plain',
      scope: 'plain',
    }
  }

  return {
    raw: line,
    scopePrefix: match[1],
    levelPrefix: match[3],
    time: match[5],
    message: match[6],
    scope: match[2] as 'frontend' | 'backend',
    level: match[4] as 'error' | 'warn' | 'info' | 'debug',
  }
}
</script>

<template>
  <teleport to="body">
    <div v-if="logDrawerOpen" class="app-overlay" @click="logDrawerOpen = false">
      <aside class="app-drawer app-drawer-wide" @click.stop>
        <div class="app-drawer-head">
          <div>
            <h2>{{ t('logs.title', 'Debug Logs') }}</h2>
            <p class="truncate">{{ currentLogFile }}</p>
          </div>
          <div class="flex items-center gap-2">
            <button class="app-secondary-btn" @click="runtime.refreshLogs()">{{ t('logs.refresh', 'Refresh') }}</button>
            <button class="app-icon-btn" @click="logDrawerOpen = false">x</button>
          </div>
        </div>

        <div class="app-drawer-body">
          <div v-if="parsedLogLines.length" class="log-viewer">
            <div
              v-for="(line, index) in parsedLogLines"
              :key="`${index}-${line.raw}`"
              class="log-line"
              :class="[`log-line-${line.level}`, `log-line-scope-${line.scope}`]"
            >
              <template v-if="line.level !== 'plain'">
                <span class="log-line-scope">{{ line.scopePrefix }}</span>
                <span class="log-line-level" :class="`log-line-level-${line.level}`">{{ line.levelPrefix }}</span>
                <span class="log-line-time">{{ line.time }}:</span>
                <span class="log-line-message" :class="`log-line-message-${line.level}`">{{ line.message }}</span>
              </template>
              <span v-else class="log-line-text">{{ line.message }}</span>
            </div>
          </div>
          <div v-else class="log-viewer-empty">{{ t('logs.empty', 'No log output yet.') }}</div>
        </div>
      </aside>
    </div>
  </teleport>
</template>
