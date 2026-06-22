<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  title: string
  icon?: string
  subtitle?: string
  count?: number
  badgeClass?: string
  startOpen?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const collapsed = ref(!props.startOpen)
const bodyRef   = ref<HTMLElement>()
const contentRef = ref<HTMLElement>()
let resizeObserver: ResizeObserver | null = null

function syncBodyHeight() {
  if (!bodyRef.value || !contentRef.value || collapsed.value) return
  bodyRef.value.style.maxHeight = `${contentRef.value.scrollHeight}px`
}

function notify(open: boolean) {
  emit('update:open', open)
}

function toggle() {
  if (collapsed.value) {
    collapsed.value = false
    notify(true)
    nextTick(syncBodyHeight)
  } else {
    if (bodyRef.value) {
      syncBodyHeight()
      requestAnimationFrame(() => {
        if (bodyRef.value) bodyRef.value.style.maxHeight = '0px'
      })
      bodyRef.value.addEventListener('transitionend', (event) => {
        if (event.target !== bodyRef.value) return
        collapsed.value = true
        notify(false)
      }, { once: true })
    }
  }
}

function open() {
  collapsed.value = false
  notify(true)
  nextTick(syncBodyHeight)
}

function close() {
  if (bodyRef.value) {
    syncBodyHeight()
    requestAnimationFrame(() => {
      if (bodyRef.value) bodyRef.value.style.maxHeight = '0px'
    })
    bodyRef.value.addEventListener('transitionend', (event) => {
      if (event.target !== bodyRef.value) return
      collapsed.value = true
      notify(false)
    }, { once: true })
  }
}

onMounted(() => {
  if (typeof ResizeObserver === 'undefined' || !contentRef.value) return

  resizeObserver = new ResizeObserver(() => {
    syncBodyHeight()
  })
  resizeObserver.observe(contentRef.value)

  if (!collapsed.value) nextTick(syncBodyHeight)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

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
      <div ref="contentRef">
        <slot />
      </div>
    </div>
  </div>
</template>
