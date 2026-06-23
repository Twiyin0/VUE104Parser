<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import ThemeToggle from './components/ThemeToggle.vue'
import ScrollToTop from './components/ScrollToTop.vue'
import PluginDrawer from './components/PluginDrawer.vue'
import DebugLogDrawer from './components/DebugLogDrawer.vue'
import { useRuntimeStore } from './stores/runtime'
import { useI18n } from './composables/useI18n'

const runtime = useRuntimeStore()
const route = useRoute()
const { ready, pluginDrawerOpen, logDrawerOpen, site, logViewerEnabled, canManagePlugins } = storeToRefs(runtime)
const { t } = useI18n()

onMounted(() => {
  void runtime.bootstrap()
})
</script>

<template>
  <div class="app-shell">
    <header class="app-topbar">
      <div class="app-brand">
        <div class="app-brand-title">{{ t('app.title', 'Vue104Parser') }}</div>
        <div class="app-brand-subtitle">{{ t('app.subtitle', 'IEC 101/104 parser workstation') }}</div>
      </div>

      <nav class="app-nav">
        <RouterLink to="/" class="app-nav-link" :class="{ active: route.path === '/' }">
          {{ t('app.navHex', 'Realtime Parse') }}
        </RouterLink>
        <RouterLink to="/fileParser" class="app-nav-link" :class="{ active: route.path === '/fileParser' }">
          {{ t('app.navLog', 'Log Parser') }}
        </RouterLink>
        <RouterLink to="/admin" class="app-nav-link" :class="{ active: route.path === '/admin' }">
          {{ t('app.navAdmin', 'Admin') }}
        </RouterLink>
      </nav>

      <div class="app-actions">
        <button class="app-secondary-btn" @click="pluginDrawerOpen = true">
          {{ canManagePlugins ? t('app.pluginManage', 'Manage Plugins') : t('app.plugins', 'Plugins') }}
        </button>
        <button v-if="logViewerEnabled" class="app-secondary-btn" @click="logDrawerOpen = true">{{ t('app.logs', 'Debug Logs') }}</button>
        <ThemeToggle />
      </div>
    </header>

    <main v-if="ready" class="app-main">
      <RouterView />
    </main>
    <main v-else class="app-loading">
      {{ t('app.loading', 'Loading runtime...') }}
    </main>

    <footer v-if="site.copyright" class="text-center text-xs text-slate-500 dark:text-slate-400 py-4 space-y-1 border-t border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 backdrop-blur">
      <div>{{ site.copyright }}</div>
      <div v-if="site.icp || site.police">
        <a v-if="site.icp" :href="site.icp_url" target="_blank" rel="noopener" class="hover:text-[var(--app-accent)] transition-colors">{{ site.icp }}</a>
        <template v-if="site.icp && site.police">&nbsp;|&nbsp;</template>
        <a v-if="site.police" :href="site.police_url" target="_blank" rel="noopener" class="hover:text-[var(--app-accent)] transition-colors">{{ site.police }}</a>
      </div>
    </footer>

    <PluginDrawer />
    <DebugLogDrawer />
    <ScrollToTop />
  </div>
</template>
