import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@dataModule': path.resolve(__dirname, './src/dataModule'),
      '@renderModule': path.resolve(__dirname, './src/renderModule'),
      '@store': path.resolve(__dirname, './src/store')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  }
})
