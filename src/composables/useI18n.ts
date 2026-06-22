import { useRuntimeStore } from '../stores/runtime'

export function useI18n() {
  const runtime = useRuntimeStore()
  return {
    t: runtime.t,
  }
}
