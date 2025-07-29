import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 5173,
    https: false, // Use HTTP for now - simpler for testing
    open: false, // Don't auto-open browser
    allowedHosts: 'all' // Allow all hosts including ngrok
  }
})
