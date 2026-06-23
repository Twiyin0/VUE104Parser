<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

interface HeroBadge {
  label: string
  tone?: 'blue' | 'cyan' | 'violet' | 'slate'
}

const props = withDefaults(defineProps<{
  icon: string
  title: string
  description?: string
  badges?: HeroBadge[]
  tone?: 'blue' | 'violet'
}>(), {
  description: '',
  badges: () => [],
  tone: 'blue',
})

const heroClass = computed(() => `page-hero page-hero-${props.tone}`)

function badgeClass(tone?: HeroBadge['tone']) {
  return `page-hero-badge page-hero-badge-${tone ?? 'slate'}`
}
</script>

<template>
  <section :class="heroClass">
    <div class="page-hero-head">
      <div class="page-hero-heading">
        <div class="page-hero-title-row">
          <h1 class="page-hero-title">
            <span class="page-hero-icon">
              <AppIcon :name="icon" size="1.5rem" />
            </span>
            <span>{{ title }}</span>
          </h1>
          <div v-if="badges.length" class="page-hero-badges">
            <span
              v-for="badge in badges"
              :key="`${badge.label}-${badge.tone ?? 'slate'}`"
              :class="badgeClass(badge.tone)"
            >
              {{ badge.label }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="page-hero-copy">
      <slot>
        <p v-if="description">{{ description }}</p>
      </slot>
    </div>
  </section>
</template>
