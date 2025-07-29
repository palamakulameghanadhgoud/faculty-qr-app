import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 3000,
    https: false, // Use HTTP for now - simpler for testing
    open: false, // Don't auto-open browser
    allowedHosts: ['localhost', '.loca.lt', '.localtunnel.me'], // Allow tunnel hosts
    hmr: {
      clientPort: 3000
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 3000
  },
  base: './' // This helps with routing issues
})
