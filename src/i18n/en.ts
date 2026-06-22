export const enMessages = {
  app: {
    title: 'Vue104Parser',
    subtitle: 'IEC 101/104 parser workstation',
    navHex: 'Realtime Parse',
    navLog: 'Log Parser',
    plugins: 'Plugins',
    logs: 'Debug Logs',
    loading: 'Loading runtime...',
  },
  theme: {
    mode: 'Mode',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    palette: 'Theme',
    ocean: 'Ocean',
    graphite: 'Graphite',
  },
  plugins: {
    title: 'Plugin Center',
    description: 'Frontend and backend capabilities are exposed as runtime plugins.',
    enabled: 'Enabled',
    disabled: 'Disabled',
    configTitle: 'Plugin Settings',
    save: 'Save Settings',
    saving: 'Saving...',
    saved: 'Saved',
    empty: 'No plugins available.',
  },
  logs: {
    title: 'Debug Logs',
    refresh: 'Refresh',
    empty: 'No log output yet.',
  },
  db: {
    title: 'Point Table DB',
    choose: 'Choose .db file',
    remove: 'Remove',
    mode: 'Point Table Mode',
    all: 'All points (Full/null priority)',
  },
}

export type FrontendMessages = typeof enMessages
