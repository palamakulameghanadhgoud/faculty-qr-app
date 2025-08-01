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
    allowedHosts: [
      'localhost', 
      '.loca.lt', 
      '.localtunnel.me',
      '.trycloudflare.com',  // Add Cloudflare support
      '.ngrok.io',           // Add ngrok support
      '.serveo.net'          // Add serveo support
    ],
    hmr: {
      clientPort: 3000
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 3000
  },
  base: './'
})
