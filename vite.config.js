import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 3000, // Use port 3000 consistently
    https: false, // Use HTTP for local development
    open: false, // Don't auto-open browser
    allowedHosts: [
      'localhost', 
      '.loca.lt', 
      '.localtunnel.me',
      '.trycloudflare.com',
      '.ngrok.io',
      '.serveo.net',
      '.onrender.com'
    ],
    hmr: {
      clientPort: 3000 // Hot Module Replacement port
    },
    // Add proxy for API calls during development
    proxy: {
      '/api': {
        target: 'https://py-lq4p.onrender.com', // Updated to your Render URL
        changeOrigin: true,
        secure: true, // Changed to true for HTTPS
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 3000
  },
  base: './'
})
