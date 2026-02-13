import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Indispensable pour accès dev depuis VPS
    port: 3000
  },
  preview: {
    // Autorise le domaine Render pour la build de production
    allowedHosts: ['clean-mboka-frontend.onrender.com']
  }
})
