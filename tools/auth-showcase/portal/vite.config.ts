import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const here = import.meta.dirname
const portalRoot = path.resolve(here, '../../..')

// Its own cacheDir: sharing node_modules/.vite with the app's dev server broke that server
// with "504 Outdated Optimize Dep".
export default defineConfig({
  root: here,
  cacheDir: path.resolve(portalRoot, 'node_modules/.vite-showcase'),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: '@clerk/clerk-react', replacement: path.resolve(here, 'clerk-stub.tsx') },
      { find: '@', replacement: path.resolve(portalRoot, 'src') },
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 5199,
    strictPort: true,
    hmr: { overlay: false },
    fs: { allow: [portalRoot] },
  },
})
