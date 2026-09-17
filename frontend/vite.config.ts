import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const { VITE_SUPABASE_URL } = loadEnv(mode, '.', '')
  // Dev-only mirror of the /photos/* rewrite in vercel.json, so the storage
  // URLs useApiData rewrites to /photos/... resolve locally as well.
  const proxy = {
    '/photos': {
      target: `${VITE_SUPABASE_URL}/storage/v1/object/public`,
      changeOrigin: true,
    },
  }
  return {
    plugins: [react(), tailwindcss()],
    server: { proxy },
    preview: { proxy },
  }
})
