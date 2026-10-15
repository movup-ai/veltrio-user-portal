// Regenerates every marketing screenshot in src/assets/auth-showcase/:
//   node tools/auth-showcase/capture.mjs            (from the user portal root)
// Starts the portal harness (5199), the marketplace mock API (4100) and the customer portal
// (next dev, 3100), captures, then stops all three. Set SHOWCASE_VERBOSE=1 for server logs.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import { installClock } from './shared/clock.ts'
import { HERO_CAR, HERO_REFERENCE, RENTER_LINK, RENTERS, TODAY_MS } from './shared/sunstate.ts'

const RENTER_NAME = RENTERS.camila.name

const here = import.meta.dirname
const portalRoot = path.resolve(here, '../..')
const customerRoot = path.resolve(portalRoot, '../veltrio-customer-portal')
const outDir = path.join(portalRoot, 'src/assets/auth-showcase')
const verbose = process.env.SHOWCASE_VERBOSE === '1'

const HARNESS = 'http://127.0.0.1:5199'
const MOCK_API = 'http://127.0.0.1:4100/api/v1'
const SITE = 'http://sunstate-car-co.localhost:3100/'
const LANGS = ['en', 'es']
const MAX_BYTES = 450 * 1024
const PAD = 8
// The renter's pages are cut from a page rather than a card, so they keep some of its margin,
// short of the 24px it has to the next edge: at PAD their headings met the close-up's edge.
const PAGE_PAD = 20

const problems = []
const warn = (message) => {
  problems.push(message)
  console.warn(`  ! ${message}`)
}

// --- Servers -------------------------------------------------------------------------------

/**
 * `next dev` appends an "agent rules" block to CLAUDE.md (or creates AGENTS.md) when it sees
 * an AI agent's variables, so they are kept from it.
 */
const AGENT_ENV =
  /^(AI_AGENT|ANTIGRAVITY_AGENT|AUGMENT_AGENT|CLAUDECODE|CLAUDE_CODE.*|CODEX_.*|COPILOT_.*|CURSOR_.*|GEMINI_CLI|OPENCODE_CLIENT|REPL_ID)$/

function withoutAgentEnv(extra) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !AGENT_ENV.test(key)))
  return { ...env, ...extra }
}

function start(name, args, options) {
  const child = spawn(process.execPath, args, {
    ...options,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    // Its own process group on POSIX, so stop() can signal the workers along with it.
    detached: process.platform !== 'win32',
  })
  const onData = (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (!line.trim()) continue
      if (verbose || line.includes('UNMOCKED')) console.log(`  [${name}] ${line}`)
    }
  }
  child.stdout.on('data', onData)
  child.stderr.on('data', onData)
  child.on('exit', (code) => verbose && console.log(`  [${name}] exited ${code}`))
  return { name, child }
}

function stop({ name, child }) {
  if (child.exitCode !== null) return
  // Next and Vite spawn workers of their own: the whole tree has to go, or a worker keeps the
  // port and the next run's strictPort start fails. A negative pid signals the process group.
  if (process.platform === 'win32')
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else {
    try {
      process.kill(-child.pid, 'SIGTERM')
    } catch (error) {
      if (error.code !== 'ESRCH') throw error // the group has already gone
    }
  }
  console.log(`  stopped ${name}`)
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(60_000) })
      if (response.status < 500) return
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`${url} did not answer within ${timeoutMs / 1000}s`)
}

/** Puts the customer portal's agent files back exactly as they were, whatever next dev did. */
async function guardAgentFiles() {
  const files = ['CLAUDE.md', 'AGENTS.md'].map((file) => path.join(customerRoot, file))
  const before = await Promise.all(files.map((file) => (existsSync(file) ? readFile(file) : null)))
  return async () => {
    for (const [i, file] of files.entries()) {
      const now = existsSync(file) ? await readFile(file) : null
      if (before[i] === null && now !== null) {
        await rm(file)
        warn(`next dev created ${path.basename(file)}; removed it`)
      } else if (before[i] !== null && (now === null || !now.equals(before[i]))) {
        await writeFile(file, before[i])
        warn(`next dev changed ${path.basename(file)}; restored it`)
      }
    }
  }
}

// --- Capturing -----------------------------------------------------------------------------

const HIDE_DEV_UI = `
  nextjs-portal, vite-error-overlay, [data-nextjs-toast], #__next-build-watcher { display: none !important; }
  *, *::before, *::after { caret-color: transparent !important; }
`

/** Waits until every image inside `scope` (the viewport when omitted) has loaded, and says which did not. */
async function settleImages(page, label, scope) {
  const check = (root) => {
    const area = root
      ? root.getBoundingClientRect()
      : { top: 0, left: 0, bottom: innerHeight, right: innerWidth }
    const images = [...document.images].filter((img) => {
      const box = img.getBoundingClientRect()
      const inside =
        box.bottom > area.top && box.top < area.bottom && box.right > area.left && box.left < area.right
      return inside && box.width > 0 && getComputedStyle(img).visibility !== 'hidden'
    })
    return images.map((img) => ({
      src: img.currentSrc || img.src,
      done: img.complete,
      ok: img.naturalWidth > 0,
    }))
  }
  const handle = scope ? await scope.elementHandle() : null
  const deadline = Date.now() + 30_000
  let images = []
  while (Date.now() < deadline) {
    images = await page.evaluate(check, handle)
    if (images.every((img) => img.done)) break
    await page.waitForTimeout(250)
  }
  for (const img of images) {
    if (!img.done) warn(`${label}: image still loading ${img.src}`)
    else if (!img.ok) warn(`${label}: broken image ${img.src}`)
  }
}

async function open(page, url, label) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180_000 })
  await page
    .waitForLoadState('networkidle', { timeout: 60_000 })
    .catch(() => warn(`${label}: network never went idle`))
  await page.addStyleTag({ content: HIDE_DEV_UI })
  await page.evaluate(() => document.fonts.ready)
  await settleImages(page, label)
  // Entrance animations (the site's cards fade up in a stagger) finish before the shot.
  await page.waitForTimeout(1200)
  await checkPage(page, label)
}

/** What would make a screenshot unusable, found in the DOM rather than by eye. */
async function checkPage(page, label) {
  const found = await page.evaluate(() => {
    const text = document.body.innerText
    const visible = (el) => {
      const box = el.getBoundingClientRect()
      return box.width > 0 && box.bottom > 0 && box.top < innerHeight
    }
    return {
      undefinedText: /\bundefined\b/.test(text),
      nanText: /\bNaN\b/.test(text),
      spinners: [...document.querySelectorAll('.animate-spin')].filter(visible).length,
      pulses: [...document.querySelectorAll('.animate-pulse')].filter(visible).length,
    }
  })
  if (found.undefinedText) warn(`${label}: the page says "undefined"`)
  if (found.nanText) warn(`${label}: the page says "NaN"`)
  if (found.spinners) warn(`${label}: ${found.spinners} spinner(s) in view`)
  if (found.pulses) warn(`${label}: ${found.pulses} loading skeleton(s) in view`)
}

/** JPEG at quality 82, lowered in steps until it fits the size budget. */
async function save(page, file, options = {}) {
  let quality = 82
  let buffer
  for (;;) {
    buffer = await page.screenshot({ ...options, type: 'jpeg', quality })
    if (buffer.length <= MAX_BYTES || quality <= 60) break
    quality -= 4
  }
  await writeFile(path.join(outDir, file), buffer)
  const kb = Math.round(buffer.length / 1024)
  console.log(`  ${file}  ${kb} KB  q${quality}`)
  if (buffer.length > MAX_BYTES) warn(`${file}: ${kb} KB even at q${quality}`)
}

/**
 * The page beside the sidebar, at 16:10. The whole window shrank to unreadable in the panel;
 * without the sidebar the same frame shows the page a fifth larger.
 */
async function saveMain(page, file) {
  const sidebar = await page.locator('aside').first().boundingBox()
  if (!sidebar) return warn(`${file}: no sidebar to crop beside`)
  const x = Math.round(sidebar.x + sidebar.width)
  const width = page.viewportSize().width - x
  await save(page, file, { clip: { x, y: 0, width, height: Math.round(width / 1.6) } })
}

/** The union of the elements' boxes plus `pad` on every side, saved as one clean card. */
async function saveCrop(page, file, locators, pad = PAD) {
  await locators[0].scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const boxes = await Promise.all(locators.map((l) => l.boundingBox()))
  if (boxes.some((box) => !box)) return warn(`${file}: crop target not found`)
  for (const l of locators) await settleImages(page, file, l)
  const x = Math.min(...boxes.map((b) => b.x)) - pad
  const y = Math.min(...boxes.map((b) => b.y)) - pad
  const right = Math.max(...boxes.map((b) => b.x + b.width)) + pad
  const bottom = Math.max(...boxes.map((b) => b.y + b.height)) + pad
  const viewport = page.viewportSize()
  const fits = y >= 0 && bottom <= viewport.height
  // A target taller than the window is cut from the full page, in page coordinates.
  const scrollY = fits ? 0 : await page.evaluate(() => scrollY)
  await save(page, file, {
    fullPage: !fits,
    clip: {
      x: Math.max(0, x),
      y: Math.max(0, y + scrollY),
      width: right - Math.max(0, x),
      height: bottom - y,
    },
  })
}

async function capturePortal(context, lang) {
  const page = await context.newPage()
  page.on('console', (message) => {
    if (message.text().includes('[showcase] unmocked')) warn(`${lang}: ${message.text()}`)
    else if (message.type() === 'error') warn(`${lang} console error: ${message.text().slice(0, 200)}`)
  })
  page.on('pageerror', (error) => warn(`${lang} page error: ${error.message}`))

  await open(page, `${HARNESS}/dashboard?lang=${lang}`, `dashboard-${lang}`)
  await saveMain(page, `dashboard-${lang}.jpg`)
  // The KPI row: the first grid on the page.
  await saveCrop(page, `dashboard-detail-${lang}.jpg`, [page.locator('main div.grid').first()])

  await open(page, `${HARNESS}/calendar?date=2026-10-13&view=week&lang=${lang}`, `calendar-${lang}`)
  await saveMain(page, `calendar-${lang}.jpg`)
  // The day header and the first two cars: the R8 picked up today and the Huracán out on rent.
  const header = page.locator('[data-calendar-label]').locator('xpath=..')
  // Scoped to the grid: the sidebar has a bordered row with the same classes.
  const rows = header.locator('xpath=..').locator(':scope > div.border-border-soft')
  await saveCrop(page, `calendar-detail-${lang}.jpg`, [header, rows.nth(0), rows.nth(1)])

  await open(page, `${HARNESS}/vehicles?lang=${lang}`, `vehicles-${lang}`)
  await saveMain(page, `vehicles-${lang}.jpg`)

  await open(page, `${HARNESS}/bookings/${HERO_REFERENCE}?lang=${lang}`, `booking-${lang}`)
  await saveMain(page, `booking-${lang}.jpg`)
  // The payment card: fully paid, with the deposit held.
  await saveCrop(page, `booking-detail-${lang}.jpg`, [
    page.locator('[class*="flex-[1_1_320px]"] > section').first(),
  ])
  // The renter's checklist: background, ID and insurance, all passed.
  const checks = page.locator('main ol[class*="lg:grid-cols-3"]')
  await saveCrop(page, `booking-checks-${lang}.jpg`, [
    checks.locator('xpath=preceding-sibling::*[1]'),
    checks,
  ])

  await page.close()
}

async function captureSite(context) {
  const page = await context.newPage()
  await page.addInitScript(installClock, TODAY_MS)
  page.on('pageerror', (error) => warn(`site page error: ${error.message}`))
  await open(page, SITE, 'site-en')
  // Far enough down that the first row of cards shows whole, not so far the fixed header hides the name.
  await page.evaluate((y) => window.scrollTo(0, y), Number(process.env.SHOWCASE_SITE_SCROLL ?? 165))
  await page.waitForTimeout(900)
  await settleImages(page, 'site-en')
  await save(page, 'site-en.jpg')
  await saveCrop(page, 'site-detail-en.jpg', [page.locator('#fleet article').first()])

  // Dates picked three days after Camila's, so the panel prices a stay rather than asking for one.
  const stay = 'pickup=2026-10-20&return=2026-10-23&pickupTime=10:00&returnTime=10:00'
  await open(page, `${SITE}vehicles/${HERO_CAR.uri}?${stay}`, 'vehicle-en')
  await saveCrop(page, 'vehicle-detail-en.jpg', [page.locator('div.rounded-xl.shadow-2').first()])

  const { contractId, token } = RENTER_LINK
  await open(page, `${SITE}sign/${contractId}/${token}`, 'sign-en')
  const form = page.locator('main form').first()
  await form.getByLabel('Full name').fill(RENTER_NAME)
  await drawSignature(page, form.locator('canvas'))
  await saveCrop(page, 'sign-detail-en.jpg', [form], PAGE_PAD)

  await open(page, `${SITE}pay/${token}`, 'pay-en')
  // The summary only: the card form is Stripe's, which the capture has no key for.
  await saveCrop(
    page,
    'pay-detail-en.jpg',
    [page.locator('main header').first(), page.locator('main dl').last()],
    PAGE_PAD,
  )
  await page.close()
}

/** A cursive-looking signature: a run of joined loops, drawn as one smooth stroke. */
async function drawSignature(page, canvas) {
  await canvas.scrollIntoViewIfNeeded()
  const box = await canvas.boundingBox()
  if (!box) return warn('sign-en: no signature pad')
  // A prolate trochoid: the pen moves right while circling, so each turn leaves a loop.
  const point = (t) => [
    box.x + box.width * (0.16 + 0.62 * t - 0.035 * Math.sin(t * 26)),
    box.y + box.height * (0.56 - 0.16 * Math.cos(t * 26) * (1 - 0.5 * t) - 0.08 * t),
  ]
  await page.mouse.move(...point(0))
  await page.mouse.down()
  for (let i = 1; i <= 160; i++) await page.mouse.move(...point(i / 160))
  await page.mouse.up()
}

// --- Run -----------------------------------------------------------------------------------

await mkdir(outDir, { recursive: true })
const restoreAgentFiles = await guardAgentFiles()

console.log('Starting servers...')
const servers = [
  start(
    'harness',
    [
      path.join(portalRoot, 'node_modules/vite/bin/vite.js'),
      '--config',
      path.join(here, 'portal/vite.config.ts'),
    ],
    {
      cwd: portalRoot,
    },
  ),
  start('mock-api', [path.join(here, 'mock-api/server.mjs')], { cwd: here }),
  start('site', [path.join(customerRoot, 'node_modules/next/dist/bin/next'), 'dev', '-p', '3100'], {
    cwd: customerRoot,
    env: withoutAgentEnv({
      NEXT_PUBLIC_API_URL: MOCK_API,
      NEXT_PUBLIC_SITE_URL: 'http://localhost:3100',
      NEXT_TELEMETRY_DISABLED: '1',
      // Blank over any key in its .env: the payment page would load Stripe against a fake secret.
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: '',
    }),
  }),
]

let browser
try {
  await Promise.all([
    waitForHttp(`${HARNESS}/`, 60_000),
    waitForHttp(`${MOCK_API}/marketplace/companies/sunstate-car-co`, 30_000),
    waitForHttp('http://127.0.0.1:3100/robots.txt', 180_000),
  ])
  console.log('Servers ready. Capturing...')

  browser = await chromium.launch({ args: ['--host-resolver-rules=MAP *.localhost 127.0.0.1'] })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'America/New_York',
  })
  for (const lang of LANGS) await capturePortal(context, lang)
  // The booking site has no Spanish version, so it is captured in English only.
  await captureSite(context)
} finally {
  await browser?.close()
  console.log('Stopping servers...')
  servers.forEach(stop)
  await new Promise((resolve) => setTimeout(resolve, 1000))
  await restoreAgentFiles()
}

if (problems.length) {
  console.log(`\nDone with ${problems.length} problem(s) to look at:`)
  for (const problem of problems) console.log(`  - ${problem}`)
  process.exitCode = 1
} else {
  console.log('\nDone. Every page passed the checks.')
}
