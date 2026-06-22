export interface ThemePreset {
  id: string
  labelKey: string
  pluginId: string
  vars: Record<string, string>
}

export const themePresets: ThemePreset[] = [
  {
    id: 'theme-ocean',
    labelKey: 'theme.ocean',
    pluginId: 'core.theme-ocean',
    vars: {
      '--app-accent': '#0f766e',
      '--app-accent-soft': 'rgba(15, 118, 110, 0.18)',
      '--app-panel-glow': 'radial-gradient(circle at top, rgba(20, 184, 166, 0.18), transparent 45%)',
    },
  },
  {
    id: 'theme-graphite',
    labelKey: 'theme.graphite',
    pluginId: 'core.theme-graphite',
    vars: {
      '--app-accent': '#475569',
      '--app-accent-soft': 'rgba(71, 85, 105, 0.2)',
      '--app-panel-glow': 'radial-gradient(circle at top, rgba(148, 163, 184, 0.18), transparent 45%)',
    },
  },
]
