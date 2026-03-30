<script setup lang="ts">
import { useTheme } from '../composables/useTheme'
const { isDark, toggle } = useTheme()
</script>

<template>
  <button @click="toggle"
    class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-300 dark:border-slate-600
           bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ml-auto">
    {{ isDark ? '☀️ 亮色' : '🌙 暗色' }}
  </button>
</template>
