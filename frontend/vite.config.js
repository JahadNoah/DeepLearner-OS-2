import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // `true` allows any host (needed for the Cloudflare demo tunnel). The string
    // 'all' is NOT special-cased by Vite 6 — it was silently blocking the tunnel.
    allowedHosts: true,
    proxy: {
      // Backend runs on :8000 (see README + main.py). Was pointing at :8001,
      // which broke every /api call made through the browser.
      '/api': 'http://localhost:8000',
    },
  },
  optimizeDeps: {
    // Only force-include packages Vite can't auto-discover or that are genuinely large.
    // react, react-dom, axios, lucide-react, react-router-dom are handled fine by Vite.
    include: [
      'firebase/app', 'firebase/auth', 'firebase/firestore',
      'framer-motion', 'three', '@react-three/fiber',
    ],
  },
})
