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
// 点击 Vibe 按钮
const vibeBtn = await page.$('button[title*="Vibe"], button:has-text("Vibe")')
if (vibeBtn) {
  await vibeBtn.click()
  await page.waitForTimeout(800)
}
await page.screenshot({ path: `${SCREENSHOTS_DIR}/vibe-open.png` })
await browser.close()
