<script setup lang="ts">
import { useTheme } from '../composables/useTheme'
import { useI18n } from '../composables/useI18n'

const { availableThemes, themeId, themeMode, setTheme, setThemeMode } = useTheme()
const { t } = useI18n()
</script>

<template>
  <div class="theme-control">
    <label class="theme-control-item">
      <span>{{ t('theme.mode', 'Mode') }}</span>
      <select
        class="app-select theme-select"
        :value="themeMode"
        @change="setThemeMode(($event.target as HTMLSelectElement).value as 'system' | 'light' | 'dark')"
      >
        <option value="system">{{ t('theme.system', 'System') }}</option>
        <option value="light">{{ t('theme.light', 'Light') }}</option>
        <option value="dark">{{ t('theme.dark', 'Dark') }}</option>
      </select>
    </label>

    <label class="theme-control-item">
      <span>{{ t('theme.palette', 'Theme') }}</span>
      <select class="app-select theme-select" :value="themeId" @change="setTheme(($event.target as HTMLSelectElement).value)">
        <option v-for="theme in availableThemes" :key="theme.id" :value="theme.id">
          {{ t(theme.labelKey, theme.id) }}
        </option>
      </select>
    </label>
  </div>
</template>
