<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTheme } from './composables/useTheme'
import ScrollToTop from './components/ScrollToTop.vue'
useTheme()

const site = ref({ copyright: '', icp: '', icp_url: '', police: '', police_url: '' })

onMounted(async () => {
  try {
    const res = await fetch('/api/v1/config')
    if (res.ok) {
      const data = await res.json()
      if (data.site) site.value = data.site
    }
  } catch {}
})
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <router-view class="flex-1" />
    <ScrollToTop />
    <footer v-if="site.copyright" class="text-center text-xs text-slate-500 dark:text-slate-400 py-4 space-y-1 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <div>{{ site.copyright }}</div>
      <div v-if="site.icp || site.police">
        <a v-if="site.icp" :href="site.icp_url" target="_blank" rel="noopener" class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{{ site.icp }}</a>
        <template v-if="site.icp && site.police">&nbsp;|&nbsp;</template>
        <a v-if="site.police" :href="site.police_url" target="_blank" rel="noopener" class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{{ site.police }}</a>
      </div>
    </footer>
  </div>
</template>
