<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'

type SelectOption = {
  value: string
  label: string
}

const props = withDefaults(defineProps<{
  modelValue: string
  options: SelectOption[]
  size?: 'md' | 'sm'
  variant?: 'default' | 'embedded'
  placeholder?: string
}>(), {
  size: 'md',
  variant: 'default',
  placeholder: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

const selectedLabel = computed(() => {
  return props.options.find((option) => option.value === props.modelValue)?.label ?? props.placeholder
})

const triggerClass = computed(() => {
  return [
    'app-select-trigger',
    props.size === 'sm' ? 'app-select-trigger-sm' : '',
    props.variant === 'embedded' ? 'app-select-trigger-embedded' : '',
  ]
})

function toggleOpen() {
  open.value = !open.value
}

function close() {
  open.value = false
}

function selectOption(value: string) {
  if (value === props.modelValue) {
    close()
    return
  }
  emit('update:modelValue', value)
  emit('change', value)
  close()
}

function onDocumentPointerDown(event: MouseEvent) {
  if (!root.value) return
  const target = event.target
  if (target instanceof Node && !root.value.contains(target)) close()
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('mousedown', onDocumentPointerDown)
  document.addEventListener('keydown', onDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<template>
  <div ref="root" class="app-select-wrap">
    <button type="button" :class="triggerClass" @click.stop="toggleOpen">
      <span class="app-select-label">{{ selectedLabel }}</span>
      <span class="app-select-chevron" :class="{ open }">
        <AppIcon name="chevron-down" size="0.95rem" />
      </span>
    </button>

    <div v-if="open" class="app-select-menu">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="app-select-option"
        :class="{ selected: option.value === modelValue }"
        @click.stop="selectOption(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
