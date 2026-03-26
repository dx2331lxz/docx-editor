#!/usr/bin/env node
import { chromium } from 'playwright'
import { join, dirname } from 'path'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCREENSHOTS_DIR = join(__dirname, '..', 'screenshots')
mkdirSync(SCREENSHOTS_DIR, { recursive: true })

const browser = await chromium.launch({ args: ['--disable-gpu', '--no-sandbox'] })
const page = await browser.newPage()
await page.setViewportSize({ width: 1440, height: 900 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)

// Take initial screenshot showing panel open
await page.screenshot({ path: join(SCREENSHOTS_DIR, 'verify-vibe-open.png') })
console.log('Panel open screenshot saved')

// Find textarea
const textareas = await page.locator('textarea').all()
console.log('Found textareas:', textareas.length)

if (textareas.length === 0) {
  console.log('❌ No textarea found!')
  await browser.close()
  process.exit(1)
}

const textarea = textareas[textareas.length - 1]
const heightBefore = await textarea.evaluate(el => el.getBoundingClientRect().height)
console.log('Height before typing:', heightBefore)

await textarea.click()
for (let i = 1; i <= 5; i++) {
  await page.keyboard.type(`Line ${i} some text content`)
  if (i < 5) await page.keyboard.press('Shift+Enter')
}
await page.waitForTimeout(500)

const heightAfter = await textarea.evaluate(el => el.getBoundingClientRect().height)
console.log('Height after typing:', heightAfter)

await page.screenshot({ path: join(SCREENSHOTS_DIR, 'verify-vibe-input.png') })
console.log('Input screenshot saved')

if (heightAfter > heightBefore + 10) {
  console.log('✅ PASS: textarea expanded from', heightBefore, '→', heightAfter)
} else {
  console.log('❌ FAIL: textarea did NOT expand (stuck at', heightAfter, ')')
}

await browser.close()
