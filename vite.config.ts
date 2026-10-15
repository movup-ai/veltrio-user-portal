import path from 'node:path'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { clerkFrontendApi, clerkJsUrl } from './src/app/providers/clerk-js.ts'

/**
 * Starts Clerk's script while the HTML is still parsing. Left to ClerkProvider it was requested
 * only once the app had booted, and the sign-in form waited behind that whole chain.
 */
function clerkPreload(publishableKey: string | undefined): Plugin {
  const host = clerkFrontendApi(publishableKey)
  return {
    name: 'veltrio:clerk-preload',
    transformIndexHtml: () =>
      host
        ? [
            // The script tag Clerk injects is crossOrigin="anonymous"; the preload must match it.
            {
              tag: 'link',
              attrs: { rel: 'preload', as: 'script', href: clerkJsUrl(host), crossorigin: 'anonymous' },
              injectTo: 'head-prepend',
            },
            // Clerk's API calls carry credentials, which a crossorigin connection cannot serve.
            { tag: 'link', attrs: { rel: 'preconnect', href: `https://${host}` }, injectTo: 'head-prepend' },
          ]
        : [],
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vite gives the config only what the shell set; the .env files are read here, so a token kept
  // in one counts the same as one set by the host. The shell's value wins where both are set.
  const sentry = loadEnv(mode, process.cwd(), 'SENTRY_')
  // Source maps go to Sentry so a stack trace names real files and lines. Only where a build is
  // given the token (the deploy), so a local or CI build neither uploads nor needs one.
  const uploadSourceMaps = Boolean(sentry.SENTRY_AUTH_TOKEN)
  const clerk = loadEnv(mode, process.cwd(), 'VITE_CLERK_')

  return {
    plugins: [
      react(),
      tailwindcss(),
      clerkPreload(clerk.VITE_CLERK_PUBLISHABLE_KEY),
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
