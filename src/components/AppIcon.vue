<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  name: string
  size?: string
  label?: string
}>(), {
  size: '1em',
  label: '',
})

const iconStyle = computed(() => ({
  '--icon-size': props.size,
  '--icon-url': `url(/iconLib/${props.name}.svg)`,
}))
</script>

<template>
  <span
    class="app-icon"
    :style="iconStyle"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? 'false' : 'true'"
  />
</template>
