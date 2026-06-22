<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRuntimeStore } from '../stores/runtime'
import { useI18n } from '../composables/useI18n'

const runtime = useRuntimeStore()
const { plugins, pluginDrawerOpen } = storeToRefs(runtime)
const { t } = useI18n()

const drafts = reactive<Record<string, Record<string, boolean | number | string>>>({})
const saving = reactive<Record<string, boolean>>({})
const errors = reactive<Record<string, string>>({})
const notices = reactive<Record<string, string>>({})
const configOpen = reactive<Record<string, boolean>>({})
const noticeTimers = new Map<string, number>()

const visiblePlugins = computed(() =>
  plugins.value.filter((plugin) => plugin.scopes.includes('frontend') || plugin.scopes.includes('backend')),
)

watch(
  plugins,
  (nextPlugins) => {
    for (const plugin of nextPlugins) {
      drafts[plugin.id] = { ...(plugin.config ?? {}) }
      errors[plugin.id] = ''
      if (!(plugin.id in notices)) notices[plugin.id] = ''
      if (!(plugin.id in configOpen)) configOpen[plugin.id] = false
    }
  },
  { immediate: true, deep: true },
)

function scopeTone(scope: 'frontend' | 'backend') {
  return scope === 'frontend' ? 'cyan' : 'blue'
}

function hasConfig(plugin: (typeof plugins.value)[number]) {
  return Boolean(plugin.backend?.configFields?.length)
}

function fieldValue(pluginId: string, key: string) {
  return drafts[pluginId]?.[key]
}

function updateField(pluginId: string, key: string, value: boolean | number | string) {
  if (!drafts[pluginId]) drafts[pluginId] = {}
  drafts[pluginId][key] = value
}

function toggleConfig(pluginId: string) {
  configOpen[pluginId] = !configOpen[pluginId]
}

function setNotice(pluginId: string, message: string) {
  notices[pluginId] = message
  const current = noticeTimers.get(pluginId)
  if (current) window.clearTimeout(current)
  const timer = window.setTimeout(() => {
    notices[pluginId] = ''
    noticeTimers.delete(pluginId)
  }, 2500)
  noticeTimers.set(pluginId, timer)
}

async function savePlugin(pluginId: string) {
  saving[pluginId] = true
  errors[pluginId] = ''
  notices[pluginId] = ''
  try {
    await runtime.savePluginConfig(pluginId, drafts[pluginId] ?? {})
    setNotice(pluginId, t('plugins.saved', '已保存'))
  } catch (error) {
    errors[pluginId] = error instanceof Error ? error.message : String(error)
  } finally {
    saving[pluginId] = false
  }
}
</script>

<template>
  <teleport to="body">
    <div v-if="pluginDrawerOpen" class="app-overlay" @click="pluginDrawerOpen = false">
      <aside class="app-drawer" @click.stop>
        <div class="app-drawer-head">
          <div>
            <h2>{{ t('plugins.title', 'Plugin Center') }}</h2>
            <p>{{ t('plugins.description', 'Runtime plugins for frontend and backend.') }}</p>
          </div>
          <button class="app-icon-btn" @click="pluginDrawerOpen = false">x</button>
        </div>

        <div v-if="visiblePlugins.length" class="app-drawer-body plugin-list">
          <div v-for="plugin in visiblePlugins" :key="plugin.id" class="plugin-card">
            <div class="plugin-card-head">
              <div class="plugin-card-main">
                <div class="plugin-card-name">{{ plugin.name }}</div>
                <div class="plugin-card-id">{{ plugin.id }}</div>
                <div class="plugin-card-tags">
                  <span class="plugin-tag" :class="`plugin-tag-${plugin.category}`">{{ plugin.category }}</span>
                  <span
                    v-for="scope in plugin.scopes"
                    :key="`${plugin.id}-${scope}`"
                    class="plugin-tag"
                    :class="`plugin-tag-${scopeTone(scope)}`"
                  >
                    {{ scope }}
                  </span>
                </div>
              </div>

              <div class="plugin-card-side">
                <span class="plugin-state-pill" :class="{ enabled: plugin.enabled }">
                  {{ plugin.enabled ? t('plugins.enabled', 'Enabled') : t('plugins.disabled', 'Disabled') }}
                </span>
                <label
                  class="plugin-switch"
                  :aria-label="plugin.enabled ? t('plugins.enabled', 'Enabled') : t('plugins.disabled', 'Disabled')"
                >
                  <input
                    :checked="plugin.enabled"
                    type="checkbox"
                    @change="runtime.setPluginEnabled(plugin.id, !plugin.enabled)"
                  />
                  <span class="plugin-switch-track">
                    <span class="plugin-switch-thumb"></span>
                  </span>
                </label>
              </div>
            </div>
            <p class="plugin-card-desc">{{ plugin.description }}</p>

            <div
              v-if="hasConfig(plugin)"
              class="plugin-config"
              :class="{ open: configOpen[plugin.id] }"
            >
              <button class="plugin-config-togglebar" type="button" @click="toggleConfig(plugin.id)">
                <span class="plugin-config-title">{{ t('plugins.configTitle', 'Plugin Settings') }}</span>
                <span class="plugin-config-chevron" :class="{ open: configOpen[plugin.id] }">⌄</span>
              </button>

              <div v-if="configOpen[plugin.id]" class="plugin-config-body">
                <div
                  v-for="field in plugin.backend?.configFields ?? []"
                  :key="`${plugin.id}-${field.key}`"
                  class="plugin-config-field"
                >
                  <label class="plugin-config-label">
                    <span>{{ field.label }}</span>
                    <input
                      v-if="field.type === 'string'"
                      class="app-input plugin-config-input"
                      :placeholder="field.placeholder ?? ''"
                      :value="String(fieldValue(plugin.id, field.key) ?? '')"
                      @input="updateField(plugin.id, field.key, ($event.target as HTMLInputElement).value)"
                    />
                    <input
                      v-else-if="field.type === 'number'"
                      class="app-input plugin-config-input"
                      type="number"
                      :min="field.min"
                      :max="field.max"
                      :step="field.step ?? 1"
                      :value="Number(fieldValue(plugin.id, field.key) ?? field.default)"
                      @input="updateField(plugin.id, field.key, Number(($event.target as HTMLInputElement).value))"
                    />
                    <span v-else class="plugin-config-toggle">
                      <input
                        type="checkbox"
                        :checked="Boolean(fieldValue(plugin.id, field.key))"
                        @change="updateField(plugin.id, field.key, ($event.target as HTMLInputElement).checked)"
                      />
                    </span>
                  </label>
                  <p v-if="field.description" class="plugin-config-help">{{ field.description }}</p>
                </div>

                <div class="plugin-config-actions">
                  <button class="app-secondary-btn" :disabled="saving[plugin.id]" @click="savePlugin(plugin.id)">
                    {{ saving[plugin.id] ? t('plugins.saving', 'Saving...') : t('plugins.save', 'Save Settings') }}
                  </button>
                  <span v-if="notices[plugin.id]" class="plugin-config-success">{{ notices[plugin.id] }}</span>
                  <span v-if="errors[plugin.id]" class="plugin-config-error">{{ errors[plugin.id] }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="app-drawer-body">
          <div class="plugin-empty">{{ t('plugins.empty', 'No plugins available.') }}</div>
        </div>
      </aside>
    </div>
  </teleport>
</template>
