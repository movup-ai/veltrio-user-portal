import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// The app's config is a function of the mode (it reads the .env files), so it is called first.
export default defineConfig((env) =>
  mergeConfig(viteConfig(env), {
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
