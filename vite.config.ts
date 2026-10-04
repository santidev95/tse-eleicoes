import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { presidentialApi } from './server/api.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'tse-presidential-api',
      configureServer(server) {
        server.middlewares.use(presidentialApi)
      },
      configurePreviewServer(server) {
        server.middlewares.use(presidentialApi)
      },
    },
  ],
})
