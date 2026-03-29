#!/usr/bin/env node
/**
 * screenshot-pagebreak.js — Verifies the Word/WPS-style inter-page gap.
 * Adds content to overflow the first page, then scrolls to the page boundary.
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

const errors = []
page.on('console', msg => {
  if (msg.type() === 'error' || msg.type() === 'warning') errors.push(`[${msg.type()}] ${msg.text()}`)
})

await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })

// Click editor and fill with content to trigger page overflow
await page.click('.ProseMirror')
await page.keyboard.press('Control+End')
for (let i = 0; i < 45; i++) {
  await page.keyboard.type(`这是第${String(i+1).padStart(2,'0')}行填充内容，用来触发分页效果，验证页间距样式是否正常显示。`)
  await page.keyboard.press('Enter')
}
await page.waitForTimeout(800)

// 297mm at 96dpi = 1122.52px; scroll to ~1080 to show the gap centered
await page.evaluate(() => {
  const scroller = document.querySelector('.flex-1.overflow-auto')
  if (scroller) scroller.scrollTop = 1080
})
await page.waitForTimeout(400)

const outPath = join(outDir, 'page-gap-check.png')
await page.screenshot({ path: outPath })
console.log(`✅ Screenshot saved: ${outPath}`)

if (errors.length === 0) {
  console.log('✅ Console clean — no errors or warnings')
} else {
  errors.forEach(e => console.error(e))
}

await browser.close()
