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
await page.waitForTimeout(800)

// Get the correct scroller (direct parent of a4-page)
const info = await page.evaluate(() => {
  const pg = document.querySelector('.a4-page')
  const scroller = pg?.parentElement
  const dividers = document.querySelectorAll('.page-gap-divider')
  return {
    scrollerScrollHeight: scroller?.scrollHeight,
    scrollerClientHeight: scroller?.clientHeight,
    dividerCount: dividers.length,
    firstDividerTop: dividers[0] ? dividers[0].style.top : 'none',
  }
})
console.log('Info:', JSON.stringify(info))

// Scroll the correct scroller to show the page gap
await page.evaluate(() => {
  const pg = document.querySelector('.a4-page')
  const scroller = pg?.parentElement
  if (scroller) scroller.scrollTop = 800  // 1122px divider, show ~300px before
})
await page.waitForTimeout(300)

const out1 = join(outDir, 'page-gap-v2.png')
await page.screenshot({ path: out1 })
console.log('✅ Screenshot saved:', out1)

if (errors.length === 0) console.log('✅ Console clean')
else errors.forEach(e => console.error(e))

await browser.close()
