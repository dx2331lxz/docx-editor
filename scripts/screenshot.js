#!/usr/bin/env node
/**
 * screenshot.js — Headless Chromium screenshot of the dev server.
 * Usage: node scripts/screenshot.js [url]
 *
 * Saves to:
 *   screenshots/latest.png
 *   screenshots/YYYY-MM-DD-HH-mm-ss.png
 *
 * Also captures console errors/warnings and reports them.
 */

import { chromium } from 'playwright'
import { join, dirname } from 'path'
import { mkdirSync, copyFileSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const URL = process.argv[2] || 'http://localhost:5173'
const SCREENSHOTS_DIR = join(__dirname, '..', 'screenshots')

async function main() {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true })

  console.log(`🌐 Launching headless Chromium → ${URL}`)
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  // ── Console monitoring ─────────────────────────────────────────────────────
  const consoleErrors = []
  const consoleWarnings = []

  page.on('console', (msg) => {
    const type = msg.type()
    const text = msg.text()
    // Skip noisy known-OK messages
    if (text.includes('Keep-Alive mechanism') || text.includes('Download the React DevTools')) return
    if (type === 'error') {
      consoleErrors.push(text)
      console.error(`  [console.error] ${text}`)
    } else if (type === 'warning') {
      consoleWarnings.push(text)
      console.warn(`  [console.warn]  ${text}`)
    }
  })

  page.on('pageerror', (err) => {
    consoleErrors.push(`[pageerror] ${err.message}`)
    console.error(`  [pageerror] ${err.message}`)
  })

  page.on('requestfailed', (req) => {
    const url = req.url()
    // Ignore chrome-extension and favicon
    if (url.startsWith('chrome-extension') || url.includes('favicon')) return
    const failure = req.failure()?.errorText || 'unknown'
    consoleErrors.push(`[net::ERR] ${url} — ${failure}`)
    console.error(`  [net::ERR] ${url} — ${failure}`)
  })
  // ──────────────────────────────────────────────────────────────────────────

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 })

  // Wait for TipTap editor to confirm page rendered
  try {
    await page.waitForSelector('.ProseMirror', { timeout: 10000 })
    console.log('✓ Editor (.ProseMirror) detected')
  } catch {
    console.warn('⚠ .ProseMirror not found — falling back to body')
    await page.waitForSelector('body', { timeout: 5000 })
  }

  // Extra settle time for fonts / layout
  await page.waitForTimeout(800)

  // Build timestamped filename
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const timestamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('-')

  const latestPath = join(SCREENSHOTS_DIR, 'latest.png')
  const timestampPath = join(SCREENSHOTS_DIR, `${timestamp}.png`)

  await page.screenshot({ path: latestPath, fullPage: true })
  copyFileSync(latestPath, timestampPath)

  await browser.close()

  console.log(`✅ Screenshot saved: ${latestPath}`)
  console.log(`✅ Backup saved:     ${timestampPath}`)

  // ── Console report ─────────────────────────────────────────────────────────
  if (consoleErrors.length === 0 && consoleWarnings.length === 0) {
    console.log('✅ Console clean — no errors or warnings')
  } else {
    if (consoleErrors.length > 0) {
      console.error(`\n❌ Console errors (${consoleErrors.length}):`)
      consoleErrors.forEach((e, i) => console.error(`  ${i + 1}. ${e}`))
    }
    if (consoleWarnings.length > 0) {
      console.warn(`\n⚠  Console warnings (${consoleWarnings.length}):`)
      consoleWarnings.forEach((w, i) => console.warn(`  ${i + 1}. ${w}`))
    }
    // Exit non-zero if there are errors (so CI can catch it)
    if (consoleErrors.length > 0) process.exit(1)
  }
}

main().catch((err) => {
  console.error('❌ Screenshot failed:', err.message)
  process.exit(1)
})
