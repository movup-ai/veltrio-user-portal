import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      // One jsdom per worker instead of per file: environment setup was ~70% of the run.
      pool: 'vmThreads',
      setupFiles: './src/test/setup.ts',
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      globals: true,
      css: true,
    },
  }),
)
