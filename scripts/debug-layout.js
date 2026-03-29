#!/usr/bin/env node
import { chromium } from 'playwright'
import { dirname, join } from 'path'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'screenshots')
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setViewportSize({ width: 1440, height: 900 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })

// Add content
await page.click('.ProseMirror')
await page.keyboard.press('Control+End')
for (let i = 0; i < 60; i++) {
  await page.keyboard.type(`第${i+1}行：填充内容。`)
  await page.keyboard.press('Enter')
}
await page.waitForTimeout(1000)

const info = await page.evaluate(() => {
  const pg = document.querySelector('.a4-page')
  const scroller = document.querySelector('.flex-1.overflow-auto')
  const scrollerStyle = scroller ? window.getComputedStyle(scroller) : null
  const pgStyle = pg ? window.getComputedStyle(pg) : null
  return {
    pageScrollHeight: pg?.scrollHeight,
    scrollerScrollHeight: scroller?.scrollHeight,
    scrollerOverflow: scrollerStyle?.overflow,
    scrollerOverflowY: scrollerStyle?.overflowY,
    scrollerHeight: scrollerStyle?.height,
    scrollerDisplay: scrollerStyle?.display,
    pgPosition: pgStyle?.position,
    pgOverflow: pgStyle?.overflow,
    pgHeight: pgStyle?.height,
    pgMinHeight: pgStyle?.minHeight,
  }
})
console.log('Layout info:', JSON.stringify(info, null, 2))

await browser.close()
