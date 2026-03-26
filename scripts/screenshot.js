#!/usr/bin/env node
/**
 * screenshot.js — Headless Chromium screenshot of the dev server.
 * Usage: node scripts/screenshot.js [url]
 *
 * Saves to:
 *   screenshots/latest.png
 *   screenshots/YYYY-MM-DD-HH-mm-ss.png
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
  await page.waitForTimeout(500)

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
}

main().catch((err) => {
  console.error('❌ Screenshot failed:', err.message)
  process.exit(1)
})
