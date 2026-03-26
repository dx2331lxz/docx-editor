import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage()
await page.setViewportSize({ width: 1440, height: 900 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)

// 找到 ... 按钮
const buttons = await page.$$('button')
for (const btn of buttons) {
  const text = await btn.innerText().catch(() => '')
  const title = await btn.getAttribute('title').catch(() => '') || ''
  if (text.trim() === '...' || title.includes('更多') || title.includes('more')) {
    console.log('Found button:', JSON.stringify(text), JSON.stringify(title))
    await btn.click()
    await page.waitForTimeout(800)
    break
  }
}

await page.screenshot({ path: '/home/dx2331lxz/projects/docx-editor/screenshots/more-tools.png', fullPage: false })
await browser.close()
