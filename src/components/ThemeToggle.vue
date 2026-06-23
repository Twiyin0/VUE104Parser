<script setup lang="ts">
import { computed } from 'vue'
import AppSelect from './AppSelect.vue'
import { useTheme } from '../composables/useTheme'
import { useI18n } from '../composables/useI18n'

const { availableThemes, themeId, themeMode, setTheme, setThemeMode } = useTheme()
const { t } = useI18n()

const modeOptions = computed(() => [
  { value: 'system', label: t('theme.system', 'System') },
  { value: 'light', label: t('theme.light', 'Light') },
  { value: 'dark', label: t('theme.dark', 'Dark') },
])

const themeOptions = computed(() => {
  return availableThemes.value.map((theme) => ({
    value: theme.id,
    label: t(theme.labelKey, theme.id),
  }))
})
</script>

<template>
  <div class="theme-control">
    <label class="theme-control-item">
      <AppSelect
        :model-value="themeMode"
        :options="modeOptions"
        variant="embedded"
        @update:model-value="setThemeMode($event as 'system' | 'light' | 'dark')"
      />
    </label>

    <label class="theme-control-item">
      <AppSelect
        :model-value="themeId"
        :options="themeOptions"
        variant="embedded"
        @update:model-value="setTheme"
      />
    </label>
  </div>
</template>
