<script setup lang="ts">
import { reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRuntimeStore } from '../stores/runtime'
import { useI18n } from '../composables/useI18n'
import PageHero from '../components/PageHero.vue'
import AppIcon from '../components/AppIcon.vue'

const runtime = useRuntimeStore()
const { adminAuthenticated, adminUsername } = storeToRefs(runtime)
const { t } = useI18n()

const form = reactive({
  username: adminUsername.value || 'admin',
  password: '',
})

const pending = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function submit() {
  pending.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await runtime.adminLogin(form.username, form.password)
    form.password = ''
    successMessage.value = t('admin.success', 'Admin mode enabled.')
    runtime.pluginDrawerOpen = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('admin.loginFailed', 'Sign in failed')
  } finally {
    pending.value = false
  }
}

function logout() {
  runtime.adminLogout()
  successMessage.value = ''
  errorMessage.value = ''
  form.password = ''
}

function openPlugins() {
  runtime.pluginDrawerOpen = true
}
</script>

<template>
  <div class="page-view">
    <div class="page-surface">
      <PageHero
        icon="shield"
        :title="t('admin.title', 'Admin Console')"
        tone="blue"
        :badges="[
          { label: adminAuthenticated ? 'LIVE' : 'LOGIN', tone: adminAuthenticated ? 'cyan' : 'slate' },
          { label: 'PLUGIN', tone: 'blue' },
        ]"
      >
        <p>{{ t('admin.description', 'Sign in to manage plugin state and runtime configuration.') }}</p>
        <p>
          {{
            adminAuthenticated
              ? t('admin.editableHint', 'Plugin changes are applied immediately after saving.')
              : t('admin.readonlyHint', 'The public pages can view plugins only. Use /admin to edit them.')
          }}
        </p>
      </PageHero>

      <div class="admin-card">
        <template v-if="!adminAuthenticated">
          <div class="admin-form-grid">
            <label class="admin-field">
              <span>{{ t('admin.username', 'Username') }}</span>
              <input v-model="form.username" class="app-input" autocomplete="username" />
            </label>
            <label class="admin-field">
              <span>{{ t('admin.password', 'Password') }}</span>
              <input v-model="form.password" type="password" class="app-input" autocomplete="current-password" @keyup.enter="submit" />
            </label>
          </div>

          <div class="admin-actions">
            <button class="btn btn-primary" :disabled="pending" @click="submit">
              <AppIcon :name="pending ? 'refresh-cw' : 'shield-check'" size="1rem" />
              {{ pending ? t('admin.loggingIn', 'Signing In...') : t('admin.login', 'Sign In') }}
            </button>
          </div>
        </template>

        <template v-else>
          <div class="admin-session-row">
            <div class="admin-session-pill">
              <AppIcon name="circle-check" size="1rem" />
              <span>{{ adminUsername }}</span>
            </div>
            <div class="admin-actions">
              <button class="btn btn-primary" @click="openPlugins">
                <AppIcon name="sliders" size="1rem" />
                {{ t('admin.openPlugins', 'Open Plugin Center') }}
              </button>
              <button class="btn btn-ghost" @click="logout">
                <AppIcon name="arrow-right-from-bracket" size="1rem" />
                {{ t('app.logout', 'Logout') }}
              </button>
            </div>
          </div>
        </template>

        <div v-if="successMessage" class="admin-notice admin-notice-success">{{ successMessage }}</div>
        <div v-if="errorMessage" class="admin-notice admin-notice-error">{{ errorMessage }}</div>
      </div>
    </div>
  </div>
</template>
