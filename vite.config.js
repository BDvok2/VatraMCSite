import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    allowedHosts: ['localhost', '127.0.0.1', '0.0.0.0', '3a6f09338176.ngrok-free.app'],
    proxy: {
      '/pl3xmap': {
        target: 'http://134.249.64.192:8123',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/pl3xmap/, '')
      },
      '/tiles': {
        target: 'http://134.249.64.192:8123',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
