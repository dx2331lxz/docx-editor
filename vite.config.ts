import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // No proxy needed — all requests go through sync-server (port 3011 dev / 3000 prod)
    // sync-server handles /api/* directly and proxies /* to Vite HMR
  },
})
