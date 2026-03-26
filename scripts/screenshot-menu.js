import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
const DIR = '/home/dx2331lxz/projects/docx-editor/screenshots'
mkdirSync(DIR, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.setViewportSize({ width: 1440, height: 900 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForSelector('.ProseMirror', { timeout: 10000 })
await page.waitForTimeout(500)
// 点击"视图"菜单
await page.click('text=视图')
await page.waitForTimeout(400)
await page.screenshot({ path: `${DIR}/menu-view.png` })
await page.keyboard.press('Escape')
await page.waitForTimeout(200)
// 点击"插入"菜单
await page.click('text=插入')
await page.waitForTimeout(400)
await page.screenshot({ path: `${DIR}/menu-insert.png` })
await browser.close()
