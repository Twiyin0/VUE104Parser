import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/parse': 'http://localhost:33104',
      '/parseLog': 'http://localhost:33104',
    }
  },
  optimizeDeps: {
    noDiscovery: true,
    include: []
  },
  build: { outDir: 'dist/public' }
})
