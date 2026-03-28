import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
const DIR = '/home/dx2331lxz/projects/docx-editor/screenshots'
mkdirSync(DIR, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.setViewportSize({ width: 1280, height: 900 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForSelector('.ProseMirror', { timeout: 10000 })
await page.waitForTimeout(500)
const btn = await page.$('text=插入')
if (btn) {
  await btn.click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${DIR}/insert-menu.png` })
}
await browser.close()
console.log('done')
