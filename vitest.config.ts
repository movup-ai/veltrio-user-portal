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
      // Typing-heavy tests take ~1s alone but passed 5s when every file ran at once on a busy
      // machine, which failed the pre-push hook at random.
      testTimeout: 20_000,
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      globals: true,
      css: true,
    },
  }),
)
