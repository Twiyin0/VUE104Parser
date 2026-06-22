export type PluginConfigFieldType = 'boolean' | 'number' | 'string'

export interface PluginConfigField {
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

export interface PluginDescriptor {
  id: string
  name: string
  description: string
  scopes: Array<'frontend' | 'backend'>
  category: 'core' | 'theme' | 'tooling'
  defaultEnabled: boolean
  frontend?: {
    featureFlags?: string[]
    themeIds?: string[]
  }
  backend?: {
    internalApis?: string[]
    configFields?: PluginConfigField[]
  }
}
