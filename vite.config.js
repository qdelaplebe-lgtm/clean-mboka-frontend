import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // INDISPENSABLE : Autorise l'accès depuis l'IP du VPS
    port: 3000
  }
})
