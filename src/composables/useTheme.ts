import { ref, onMounted } from 'vue'

const isDark = ref(false)

export function useTheme() {
  function apply(dark: boolean) {
    isDark.value = dark
    document.documentElement.classList.toggle('dark', dark)
  }

  function toggle() {
    const next = !isDark.value
    localStorage.setItem('theme', next ? 'dark' : 'light')
    apply(next)
  }

  onMounted(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    apply(saved ? saved === 'dark' : prefersDark)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem('theme')) apply(e.matches)
    })
  })

  return { isDark, toggle }
}
