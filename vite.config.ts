import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Keep this part, it is working!
  css: {
    lightningcss: {
      errorRecovery: true, 
    }
  },
})