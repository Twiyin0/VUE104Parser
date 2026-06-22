import { storeToRefs } from 'pinia'
import { useRuntimeStore } from '../stores/runtime'

export function useTheme() {
  const runtime = useRuntimeStore()
  const { availableThemes, themeId, themeMode } = storeToRefs(runtime)

  return {
    availableThemes,
    themeId,
    themeMode,
    setTheme: runtime.setTheme,
    setThemeMode: runtime.setThemeMode,
  }
}
