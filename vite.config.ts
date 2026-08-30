import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // `npm run dev:api` serves the real handlers here.
      '/api': {
        target: `http://localhost:${process.env.PEACOCK_API_PORT ?? 5179}`,
        changeOrigin: false,
      },
    },
  },
})
