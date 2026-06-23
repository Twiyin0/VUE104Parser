<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import AppIcon from './AppIcon.vue'

const visible = ref(false)
let ticking = false

function onScroll() {
  if (!ticking) {
    requestAnimationFrame(() => {
      visible.value = window.scrollY > 300
      ticking = false
    })
    ticking = true
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <Transition name="scroll-btn">
    <button
      v-if="visible"
      @click="scrollToTop"
      class="fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full
             bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600
             text-slate-600 dark:text-slate-300 shadow-lg shadow-black/10
             hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-blue-400 dark:hover:border-blue-500
             hover:text-blue-600 dark:hover:text-blue-400
             active:scale-95 transition-colors duration-200
             flex items-center justify-center text-2xl font-black"
      title="回到顶部"
    >
      <AppIcon name="arrow-up" size="1.1rem" />
    </button>
  </Transition>
</template>

<style scoped>
.scroll-btn-enter-active {
  animation: rise-bounce 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.scroll-btn-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.scroll-btn-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

@keyframes rise-bounce {
  0%   { opacity: 0; transform: translateY(60px); }
  50%  { opacity: 1; transform: translateY(-8px); }
  65%  { transform: translateY(4px); }
  80%  { transform: translateY(-4px); }
  90%  { transform: translateY(2px); }
  100% { opacity: 1; transform: translateY(0); }
}
</style>
