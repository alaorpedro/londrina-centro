import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5183,
    // em dev o front roda no Vite e a API no Express (npm run dev:api)
    proxy: { '/api': 'http://localhost:3000' },
  },
})
