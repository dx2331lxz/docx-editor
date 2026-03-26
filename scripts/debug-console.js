import { chromium } from 'playwright'

const browser = await chromium.launch({ args: ['--disable-gpu', '--no-sandbox'] })
const page = await browser.newPage()

const errors = []
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text())
})
page.on('pageerror', err => errors.push('PAGE ERROR: ' + err.message))

await page.setViewportSize({ width: 1440, height: 900 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)

console.log('=== Console errors ===')
errors.forEach(e => console.log(e))
console.log('=== Total errors:', errors.length)

const body = await page.locator('body').innerHTML()
console.log('=== Body innerHTML length:', body.length)
console.log('=== Body snippet:', body.substring(0, 500))

await browser.close()
