import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
  {
    entry: 'src/electron/main.js',
  },
  {
    entry: 'src/electron/preload.cjs',
    vite: {
      build: {
        lib: {
          entry: 'src/electron/preload.cjs',
          formats: ['cjs'],
          fileName: () => 'preload.cjs',
        },
        rollupOptions: {
          external: ['electron'],
        },
      },
    },
  },
]),
    renderer()
  ],
})

