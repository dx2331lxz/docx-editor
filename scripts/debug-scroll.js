#!/usr/bin/env node
import { chromium } from 'playwright'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setViewportSize({ width: 1440, height: 900 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })

await page.click('.ProseMirror')
await page.keyboard.press('Control+End')
for (let i = 0; i < 60; i++) {
  await page.keyboard.type(`第${i+1}行填充`)
  await page.keyboard.press('Enter')
}
await page.waitForTimeout(1000)

const info = await page.evaluate(() => {
  // Find ALL ancestors of .a4-page
  const pg = document.querySelector('.a4-page')
  const results = []
  let el = pg?.parentElement
  let depth = 0
  while (el && depth < 6) {
    const s = window.getComputedStyle(el)
    results.push({
      depth,
      class: el.className.slice(0, 80),
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflowY: s.overflowY,
      height: s.height,
      display: s.display,
    })
    el = el.parentElement
    depth++
  }
  return results
})
console.log('Ancestor chain:')
info.forEach(n => console.log(JSON.stringify(n)))
await browser.close()
