import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    // allow serving the workspace packages (TS source) from the monorepo root
    fs: { allow: ['..'] },
  },
})
