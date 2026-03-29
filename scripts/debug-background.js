#!/usr/bin/env node
/**
 * debug-background.js — Checks computed background style on .a4-page
 */
import { chromium } from 'playwright'
import { join, dirname } from 'path'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'screenshots')
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setViewportSize({ width: 1440, height: 900 })

await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })

// Add lots of content
await page.click('.ProseMirror')
await page.keyboard.press('Control+End')
for (let i = 0; i < 45; i++) {
  await page.keyboard.type(`第${i+1}行`)
  await page.keyboard.press('Enter')
}
await page.waitForTimeout(800)

// Check computed styles
const info = await page.evaluate(() => {
  const el = document.querySelector('.a4-page')
  if (!el) return { error: 'No .a4-page found' }
  const style = window.getComputedStyle(el)
  const rect = el.getBoundingClientRect()
  return {
    background: el.style.background || '(no inline)',
    computedBackground: style.background.slice(0, 200),
    height: rect.height,
    scrollHeight: el.scrollHeight,
    minHeight: style.minHeight,
  }
})

console.log('a4-page style info:', JSON.stringify(info, null, 2))

// screenshot at 297mm boundary (~1122px scrolled)
await page.evaluate(() => {
  const scroller = document.querySelector('.flex-1.overflow-auto')
  if (scroller) scroller.scrollTop = 1050
})
await page.waitForTimeout(300)
await page.screenshot({ path: join(outDir, 'debug-bg.png') })
console.log('Screenshot saved')

await browser.close()
