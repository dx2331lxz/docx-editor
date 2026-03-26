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

const fileMenu = await page.$('text=文件')
if (fileMenu) {
  await fileMenu.click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${DIR}/file-menu-pdf.png` })
  const pdfItem = await page.$('text=导出为 PDF')
  console.log(pdfItem ? '✅ 导出为 PDF item found in file menu' : '❌ 导出为 PDF item NOT found')
} else {
  console.log('❌ 文件 menu button not found')
}
await browser.close()
