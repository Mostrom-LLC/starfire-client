import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const VITE_BACKEND_URL = process.env.VITE_BACKEND_URL

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  preview: {
    host: '0.0.0.0',
    port: 80,
    strictPort: true,
    cors: true,
    allowedHosts: true
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    cors: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: VITE_BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: VITE_BACKEND_URL?.replace('http://', ''),
        ws: true,
        changeOrigin: true,
      },
    },
  },
})


