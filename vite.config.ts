import path from 'node:path'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vite gives the config only what the shell set; the .env files are read here, so a token kept
  // in one counts the same as one set by the host. The shell's value wins where both are set.
  const sentry = loadEnv(mode, process.cwd(), 'SENTRY_')
  // Source maps go to Sentry so a stack trace names real files and lines. Only where a build is
  // given the token (the deploy), so a local or CI build neither uploads nor needs one.
  const uploadSourceMaps = Boolean(sentry.SENTRY_AUTH_TOKEN)

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Last, as it reads the finished bundle.
      ...(uploadSourceMaps
        ? [
            sentryVitePlugin({
              org: sentry.SENTRY_ORG,
              project: sentry.SENTRY_PROJECT,
              authToken: sentry.SENTRY_AUTH_TOKEN,
              telemetry: false,
              // Uploaded, then removed: the maps are for Sentry, not for anyone who opens the site.
              sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
            }),
          ]
        : []),
    ],
    build: { sourcemap: uploadSourceMaps ? 'hidden' : false },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
  }
})
