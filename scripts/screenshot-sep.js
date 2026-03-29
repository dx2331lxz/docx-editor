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

const errors = []
page.on('console', msg => {
  if (msg.type() === 'error' || msg.type() === 'warning') errors.push(`[${msg.type()}] ${msg.text()}`)
})

await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })

// Add content
await page.click('.ProseMirror')
await page.keyboard.press('Control+End')
for (let i = 0; i < 60; i++) {
  await page.keyboard.type(`这是第${i+1}行填充内容，用来触发分页效果，验证页间距样式是否正常显示。`)
  await page.keyboard.press('Enter')
}
await page.waitForTimeout(1000)

const info = await page.evaluate(() => {
  const pg = document.querySelector('.a4-page')
  const scroller = pg?.parentElement
  const sepLines = document.querySelectorAll('.page-sep-line')
  return {
    pageH: pg?.scrollHeight,
    scrollerScrollH: scroller?.scrollHeight,
    sepLineCount: sepLines.length,
    firstSepTop: sepLines[0] ? sepLines[0].style.top : 'none',
  }
})
console.log('Info:', JSON.stringify(info))

// Scroll to just before the first separator
const scrollTo = Math.max(0, info.firstSepTop !== 'none' ? parseInt(info.firstSepTop) - 250 : 800)
await page.evaluate((top) => {
  const scroller = document.querySelector('.a4-page')?.parentElement
  if (scroller) scroller.scrollTop = top
}, scrollTo)
await page.waitForTimeout(300)

const out = join(outDir, 'page-sep-check.png')
await page.screenshot({ path: out })
console.log('✅ Screenshot:', out, '| scrolled to', scrollTo)
if (errors.length === 0) console.log('✅ Console clean')
else errors.forEach(e => console.error(e))

await browser.close()
