import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: 'all',
    proxy: {
      '/api': 'http://localhost:8001',
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
