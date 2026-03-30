<script setup lang="ts">
import { ref, nextTick } from 'vue'

const props = defineProps<{
  title: string
  icon?: string
  subtitle?: string
  count?: number
  badgeClass?: string
  startOpen?: boolean
}>()

const collapsed = ref(!props.startOpen)
const bodyRef   = ref<HTMLElement>()

function toggle() {
  if (collapsed.value) {
    collapsed.value = false
    nextTick(() => {
      if (bodyRef.value) bodyRef.value.style.maxHeight = bodyRef.value.scrollHeight + 'px'
    })
  } else {
    if (bodyRef.value) {
      bodyRef.value.style.maxHeight = bodyRef.value.scrollHeight + 'px'
      requestAnimationFrame(() => {
        bodyRef.value.style.maxHeight = '0px'
        collapsed.value = true
      })
    }
  }
}

function open() {
  collapsed.value = false
  nextTick(() => {
    if (bodyRef.value) bodyRef.value.style.maxHeight = bodyRef.value.scrollHeight + 'px'
  })
}

function close() {
  if (bodyRef.value) {
    bodyRef.value.style.maxHeight = bodyRef.value.scrollHeight + 'px'
    requestAnimationFrame(() => {
      bodyRef.value.style.maxHeight = '0px'
      collapsed.value = true
    })
  }
}

defineExpose({ open, close })
</script>

<template>
  <div class="cs" :class="{ collapsed }">
    <div class="cs-head" @click="toggle">
      <div class="cs-head-left">
        <span v-if="icon">{{ icon }}</span>
        {{ title }}
        <small v-if="subtitle" class="text-slate-400 dark:text-slate-500 font-normal text-xs">{{ subtitle }}</small>
        <span class="cs-badge" :class="[badgeClass, { zero: !count }]">{{ count ?? 0 }}</span>
      </div>
      <span class="cs-chevron">▾</span>
    </div>
    <div class="cs-body" ref="bodyRef">
      <slot />
    </div>
  </div>
</template>
