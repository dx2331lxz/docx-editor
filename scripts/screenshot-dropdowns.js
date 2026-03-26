import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const SCREENSHOTS_DIR = '/home/dx2331lxz/projects/docx-editor/screenshots'
mkdirSync(SCREENSHOTS_DIR, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.setViewportSize({ width: 1440, height: 900 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForSelector('.ProseMirror', { timeout: 10000 })
await page.waitForTimeout(800)

// 点击字体下拉（FontSelector）
const fontBtn = await page.$('[title="字体"], button:has-text("宋体"), .font-selector button')
if (fontBtn) {
  await fontBtn.click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/dropdown-font.png` })
  console.log('✅ font dropdown')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
} else { console.log('⚠ font button not found') }

// 点击颜色选择器
const colorBtn = await page.$('[title="字体颜色"], [title="文字颜色"], button[title*="颜色"]')
if (colorBtn) {
  await colorBtn.click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/dropdown-color.png` })
  console.log('✅ color dropdown')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
} else { console.log('⚠ color button not found') }

await browser.close()
