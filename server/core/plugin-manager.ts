import fs from 'fs'
import path from 'path'
import type { PluginConfigField, PluginDescriptor } from '../plugins/types'

type PluginConfigValue = boolean | number | string
type PluginConfigMap = Record<string, PluginConfigValue>
type PluginStatePayload = {
  enabled?: Record<string, boolean>
  configs?: Record<string, PluginConfigMap>
}

export type PluginChangeEvent =
  | { type: 'enabled'; id: string; enabled: boolean }
  | { type: 'config'; id: string; config: PluginConfigMap }

function cloneConfig(config: PluginConfigMap) {
  return Object.fromEntries(Object.entries(config)) as PluginConfigMap
}

function defaultConfigFor(descriptor: PluginDescriptor) {
  const config: PluginConfigMap = {}
  for (const field of descriptor.backend?.configFields ?? []) {
    config[field.key] = field.default
  }
  return config
}

function normalizeFieldValue(field: PluginConfigField, value: unknown): PluginConfigValue {
  if (field.type === 'boolean') {
    if (typeof value !== 'boolean') throw new Error(`Invalid boolean value for ${field.key}`)
    return value
  }

  if (field.type === 'number') {
    if (typeof value !== 'number' || Number.isNaN(value)) throw new Error(`Invalid number value for ${field.key}`)
    if (field.min != null && value < field.min) throw new Error(`${field.key} must be >= ${field.min}`)
    if (field.max != null && value > field.max) throw new Error(`${field.key} must be <= ${field.max}`)
    return value
  }

  if (typeof value !== 'string') throw new Error(`Invalid string value for ${field.key}`)
  return value
}

export class PluginManager {
  private readonly descriptors = new Map<string, PluginDescriptor>()
  private readonly statePath: string
  private readonly enabledState = new Map<string, boolean>()
  private readonly configState = new Map<string, PluginConfigMap>()
  private readonly listeners = new Set<(event: PluginChangeEvent) => void>()

  constructor(stateFile: string, enabledByConfig: string[], descriptors: PluginDescriptor[]) {
    this.statePath = path.resolve(stateFile)
    fs.mkdirSync(path.dirname(this.statePath), { recursive: true })

    for (const descriptor of descriptors) {
      this.descriptors.set(descriptor.id, descriptor)
      this.enabledState.set(descriptor.id, descriptor.defaultEnabled || enabledByConfig.includes(descriptor.id))
      this.configState.set(descriptor.id, defaultConfigFor(descriptor))
    }

    this.loadState(enabledByConfig)
    this.persist()
  }

  list() {
    return [...this.descriptors.values()].map((descriptor) => ({
      ...descriptor,
      enabled: this.isEnabled(descriptor.id),
      config: this.getConfig(descriptor.id),
    }))
  }

  isEnabled(id: string) {
    return this.enabledState.get(id) ?? false
  }

  getConfig(id: string) {
    return cloneConfig(this.configState.get(id) ?? {})
  }

  setEnabled(id: string, enabled: boolean) {
    if (!this.descriptors.has(id)) return false
    this.enabledState.set(id, enabled)
    this.persist()
    for (const listener of this.listeners) listener({ type: 'enabled', id, enabled })
    return true
  }

  setConfig(id: string, nextConfig: Record<string, unknown>) {
    const descriptor = this.descriptors.get(id)
    if (!descriptor) return false

    const fields = descriptor.backend?.configFields ?? []
    const merged = defaultConfigFor(descriptor)
    const current = this.configState.get(id) ?? {}

    for (const [key, value] of Object.entries(current)) merged[key] = value

    for (const field of fields) {
      if (!(field.key in nextConfig)) continue
      merged[field.key] = normalizeFieldValue(field, nextConfig[field.key])
    }

    this.configState.set(id, merged)
    this.persist()
    for (const listener of this.listeners) listener({ type: 'config', id, config: this.getConfig(id) })
    return true
  }

  getDescriptor(id: string) {
    return this.descriptors.get(id)
  }

  onChange(listener: (event: PluginChangeEvent) => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private loadState(enabledByConfig: string[]) {
    if (!fs.existsSync(this.statePath)) return

    try {
      const raw = JSON.parse(fs.readFileSync(this.statePath, 'utf-8')) as Record<string, boolean> | PluginStatePayload

      if (this.isLegacyEnabledMap(raw)) {
        for (const [id, value] of Object.entries(raw)) {
          if (this.descriptors.has(id)) this.enabledState.set(id, Boolean(value))
        }
        return
      }

      for (const [id, value] of Object.entries(raw.enabled ?? {})) {
        if (this.descriptors.has(id)) this.enabledState.set(id, Boolean(value))
      }

      for (const [id, config] of Object.entries(raw.configs ?? {})) {
        const descriptor = this.descriptors.get(id)
        if (!descriptor) continue

        const fields = descriptor.backend?.configFields ?? []
        const merged = defaultConfigFor(descriptor)
        for (const field of fields) {
          if (!(field.key in config)) continue
          try {
            merged[field.key] = normalizeFieldValue(field, config[field.key])
          } catch {
            merged[field.key] = field.default
          }
        }
        this.configState.set(id, merged)
      }
    } catch {
      for (const id of enabledByConfig) {
        if (this.descriptors.has(id)) this.enabledState.set(id, true)
      }
    }
  }

  private persist() {
    const payload: PluginStatePayload = {
      enabled: Object.fromEntries(this.enabledState.entries()),
      configs: Object.fromEntries(
        [...this.configState.entries()].map(([id, config]) => [id, cloneConfig(config)]),
      ),
    }
    fs.writeFileSync(this.statePath, JSON.stringify(payload, null, 2), 'utf-8')
  }

  private isLegacyEnabledMap(value: Record<string, boolean> | PluginStatePayload): value is Record<string, boolean> {
    return !('enabled' in value) && !('configs' in value)
  }
}
