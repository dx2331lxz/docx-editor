#!/usr/bin/env node
import { chromium } from 'playwright'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setViewportSize({ width: 1440, height: 900 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)

const info = await page.evaluate(() => {
  const pg = document.querySelector('.a4-page')
  if (!pg) return { error: 'no .a4-page' }
  return {
    inlineBackground: pg.style.background,
    inlineBackgroundImage: pg.style.backgroundImage,
    computedBg: window.getComputedStyle(pg).background.slice(0, 300),
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
