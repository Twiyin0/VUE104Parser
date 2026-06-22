import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { load as loadYaml } from 'js-yaml'
import { enMessages, type FrontendMessages } from '../i18n/en'
import { themePresets, type ThemePreset } from '../theme/presets'
import { clientLogger } from '../services/logger'

type PluginConfigFieldType = 'boolean' | 'number' | 'string'

type PluginConfigField = {
  key: string
  label: string
  description?: string
  type: PluginConfigFieldType
  default: boolean | number | string
  min?: number
  max?: number
  step?: number
  placeholder?: string
}

type PluginDescriptor = {
  id: string
  name: string
  description: string
  category: 'core' | 'theme' | 'tooling'
  scopes: Array<'frontend' | 'backend'>
  enabled: boolean
  config?: Record<string, boolean | number | string>
  frontend?: {
    featureFlags?: string[]
    themeIds?: string[]
  }
  backend?: {
    configFields?: PluginConfigField[]
  }
}

type BootstrapPayload = {
  apiVersion: string
  locale: {
    default: string
    fallback: string
    frontend: string
    backend: string
  }
  logger: {
    level: number
    file: string
    exposeDebugApi: boolean
  }
  site: {
    copyright: string
    icp: string
    icp_url: string
    police: string
    police_url: string
  }
  theme: {
    defaultMode: 'system' | 'light' | 'dark'
    defaultTheme: string
  }
  plugins: PluginDescriptor[]
}

function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result: Record<string, any> = { ...target }
  for (const key of Object.keys(source)) {
    const sourceValue = source[key]
    const targetValue = result[key]
    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue) && targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
      result[key] = deepMerge(targetValue, sourceValue)
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue
    }
  }
  return result as T
}

function readStoredMode(defaultMode: 'system' | 'light' | 'dark') {
  const saved = localStorage.getItem('app.theme.mode')
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : defaultMode
}

function readStoredTheme(defaultTheme: string) {
  return localStorage.getItem('app.theme.id') || defaultTheme
}

export const useRuntimeStore = defineStore('runtime', () => {
  const ready = ref(false)
  const pluginDrawerOpen = ref(false)
  const logDrawerOpen = ref(false)
  const locale = ref('zh-cn')
  const messages = ref<FrontendMessages>(enMessages)
  const plugins = ref<PluginDescriptor[]>([])
  const logLines = ref<string[]>([])
  const currentLogFile = ref('')
  const apiVersion = ref('2.0.0')
  const site = ref({
    copyright: '',
    icp: '',
    icp_url: '',
    police: '',
    police_url: '',
  })
  const themeMode = ref<'system' | 'light' | 'dark'>('system')
  const themeId = ref('theme-ocean')

  const enabledPlugins = computed(() => plugins.value.filter((plugin) => plugin.enabled))
  const enabledPluginIds = computed(() => new Set(enabledPlugins.value.map((plugin) => plugin.id)))
  const availableThemes = computed<ThemePreset[]>(() =>
    themePresets.filter((theme) => enabledPluginIds.value.has(theme.pluginId)),
  )
  const logViewerEnabled = computed(() =>
    enabledPlugins.value.some((plugin) => plugin.frontend?.featureFlags?.includes('debug-log-viewer')),
  )

  function t(path: string, fallback = path) {
    const parts = path.split('.')
    let current: any = messages.value
    for (const part of parts) {
      current = current?.[part]
    }
    return typeof current === 'string' ? current : fallback
  }

  function applyTheme() {
    const root = document.documentElement
    const selectedTheme = availableThemes.value.find((theme) => theme.id === themeId.value) ?? availableThemes.value[0]

    if (selectedTheme) {
      for (const [key, value] of Object.entries(selectedTheme.vars)) {
        root.style.setProperty(key, value)
      }
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = themeMode.value === 'dark' || (themeMode.value === 'system' && prefersDark)
    root.classList.toggle('dark', dark)
    root.dataset.theme = selectedTheme?.id ?? ''
    root.dataset.themeMode = themeMode.value
  }

  async function loadLocalePack(localeCode: string) {
    try {
      const response = await fetch(`/i18n/${localeCode}.yml`)
      if (!response.ok) return
      const content = await response.text()
      const parsed = (loadYaml(content) as Partial<FrontendMessages> | undefined) ?? {}
      messages.value = deepMerge(enMessages, parsed)
      locale.value = localeCode
    } catch {
      messages.value = enMessages
      locale.value = 'en'
    }
  }

  async function bootstrap() {
    if (ready.value) return

    const bootstrapResponse = await fetch('/api/v1/system/bootstrap')
    const bootstrapData = await bootstrapResponse.json() as BootstrapPayload

    apiVersion.value = bootstrapData.apiVersion
    site.value = bootstrapData.site
    plugins.value = bootstrapData.plugins

    await loadLocalePack(bootstrapData.locale.frontend || 'zh-cn')

    themeMode.value = readStoredMode(bootstrapData.theme.defaultMode)
    themeId.value = readStoredTheme(bootstrapData.theme.defaultTheme)

    if (!availableThemes.value.some((theme) => theme.id === themeId.value)) {
      themeId.value = availableThemes.value[0]?.id ?? bootstrapData.theme.defaultTheme
    }

    applyTheme()
    ready.value = true
    void clientLogger.info('runtime bootstrapped', { apiVersion: apiVersion.value })
  }

  async function setPluginEnabled(id: string, enabled: boolean) {
    const response = await fetch(`/api/v1/system/plugins/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    const payload = await response.json()
    if (payload.plugin) {
      plugins.value = plugins.value.map((plugin) => plugin.id === id ? payload.plugin : plugin)
      if (!availableThemes.value.some((theme) => theme.id === themeId.value)) {
        themeId.value = availableThemes.value[0]?.id ?? themeId.value
      }
      applyTheme()
      void clientLogger.info('plugin toggled', { id, enabled })
    }
  }

  async function savePluginConfig(id: string, config: Record<string, boolean | number | string>) {
    const response = await fetch(`/api/v1/system/plugins/${id}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error ?? 'Failed to save plugin config')

    if (payload.plugin) {
      plugins.value = plugins.value.map((plugin) => plugin.id === id ? payload.plugin : plugin)
      void clientLogger.info('plugin config saved', { id, keys: Object.keys(config) })
    }
  }

  async function refreshLogs(limit = 200) {
    const response = await fetch(`/api/v1/system/logs?limit=${limit}`)
    const payload = await response.json()
    logLines.value = payload.lines ?? []
    currentLogFile.value = payload.file ?? ''
  }

  function setThemeMode(mode: 'system' | 'light' | 'dark') {
    themeMode.value = mode
    localStorage.setItem('app.theme.mode', mode)
    applyTheme()
  }

  function setTheme(theme: string) {
    themeId.value = theme
    localStorage.setItem('app.theme.id', theme)
    applyTheme()
  }

  return {
    ready,
    pluginDrawerOpen,
    logDrawerOpen,
    locale,
    apiVersion,
    site,
    plugins,
    enabledPlugins,
    availableThemes,
    logLines,
    currentLogFile,
    logViewerEnabled,
    themeMode,
    themeId,
    t,
    bootstrap,
    setPluginEnabled,
    savePluginConfig,
    refreshLogs,
    setThemeMode,
    setTheme,
    applyTheme,
  }
})
