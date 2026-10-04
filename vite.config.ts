import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { createPresidentialApi } from './server/api.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: 'tse-presidential-api',
      configureServer(server) {
        server.middlewares.use(createPresidentialApi({ ...loadEnv(mode, process.cwd(), ''), ...process.env }))
      },
      configurePreviewServer(server) {
        server.middlewares.use(createPresidentialApi({ ...loadEnv(mode, process.cwd(), ''), ...process.env }))
      },
    },
  ],
}))
