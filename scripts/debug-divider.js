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
  await page.keyboard.type(`第${i+1}行：这是填充内容，用于触发分页效果验证。`)
  await page.keyboard.press('Enter')
}
await page.waitForTimeout(1000)

const info = await page.evaluate(() => {
  const pg = document.querySelector('.a4-page')
  const scroller = document.querySelector('.flex-1.overflow-auto')
  const dividers = document.querySelectorAll('.page-gap-divider')
  return {
    pageScrollHeight: pg?.scrollHeight,
    pageClientHeight: pg?.clientHeight,
    scrollerScrollHeight: scroller?.scrollHeight,
    dividerCount: dividers.length,
    dividerTops: Array.from(dividers).map(d => d.style.top),
    pageOverflow: pg ? window.getComputedStyle(pg).overflow : 'n/a',
  }
})
console.log('DOM info:', JSON.stringify(info, null, 2))

// scroll to where the first divider should be
const scrollTo = Math.max(0, (info.dividerTops[0] ? parseInt(info.dividerTops[0]) - 300 : 1080))
await page.evaluate((top) => {
  const s = document.querySelector('.flex-1.overflow-auto')
  if (s) s.scrollTop = top
}, scrollTo)
await page.waitForTimeout(300)

await page.screenshot({ path: join(outDir, 'debug-divider.png') })
console.log('Screenshot done, scrolled to', scrollTo)
await browser.close()
