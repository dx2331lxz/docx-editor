import { chromium } from 'playwright'
import { join, dirname } from 'path'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))
const DIR = join(__dirname, '..', 'screenshots')
mkdirSync(DIR, { recursive: true })

const browser = await chromium.launch({ args: ['--disable-gpu', '--no-sandbox'] })
const page = await browser.newPage()
await page.setViewportSize({ width: 1440, height: 900 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

// Click the ··· More button
const moreBtn = page.locator('button[title="更多工具"]')
await moreBtn.click()
await page.waitForTimeout(400)

await page.screenshot({ path: join(DIR, 'verify-more-dropdown.png') })
console.log('Screenshot saved')

// Check dropdown is rendered in body (not inside overflow container)
const dropdownInBody = await page.evaluate(() => {
  const allDivs = document.querySelectorAll('body > div')
  for (const d of allDivs) {
    if (d.style.position === 'fixed' && parseInt(d.style.zIndex) >= 9999) return true
  }
  return false
})
console.log('Dropdown portal in body:', dropdownInBody ? '✅ YES' : '❌ NO (might be in shadow DOM or different structure)')

await browser.close()
