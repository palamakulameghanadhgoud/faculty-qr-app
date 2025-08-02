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
        target: 'http://localhost:5000', // Updated to your current IP
        changeOrigin: true,
        secure: false,
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
