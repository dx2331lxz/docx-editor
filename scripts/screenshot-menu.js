import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
const DIR = '/home/dx2331lxz/projects/docx-editor/screenshots'
mkdirSync(DIR, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.setViewportSize({ width: 1440, height: 900 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForSelector('.ProseMirror', { timeout: 10000 })
await page.waitForTimeout(600)

// 点击"插入"菜单
const insertBtn = await page.$('button:has-text("插入"), [data-menu="insert"], nav >> text=插入')
if (insertBtn) {
  await insertBtn.click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${DIR}/menu-insert.png` })
  console.log('✅ insert menu')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
} else {
  // fallback：找所有包含"插入"文字的可点击元素
  await page.click('text=插入')
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${DIR}/menu-insert.png` })
  console.log('✅ insert menu (fallback)')
}

await browser.close()
