import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig(({ mode }) => ({
  base: mode === 'development' ? '/' : '/fundadores-3d/',
  plugins: [vue()],
}))
