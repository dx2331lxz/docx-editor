#!/usr/bin/env node
import { chromium } from 'playwright'
import { join, dirname } from 'path'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const URL = 'http://localhost:3011'
const DOCX_PATH = '/home/dx2331lxz/.openclaw/workspace/docs/代码重构社会.docx'
const SCREENSHOTS_DIR = join(__dirname, '..', 'screenshots')

async function main() {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForSelector('.ProseMirror', { timeout: 10000 })
  await page.waitForTimeout(1000)

  const fileInput = await page.$('input[type="file"]')
  if (fileInput) {
    await fileInput.setInputFiles(DOCX_PATH)
  }
  await page.waitForTimeout(3000)

  // Get page margin from the page element
  const measurements = await page.evaluate(() => {
    const editor = document.querySelector('.ProseMirror')
    const pageEl = editor?.closest('[class*="page"]') || editor?.parentElement
    const pageStyle = pageEl ? getComputedStyle(pageEl) : null
    const editorRect = editor?.getBoundingClientRect()
    const pageRect = pageEl?.getBoundingClientRect()

    // Check first paragraph's line-height and font-size
    const p = editor?.querySelector('p')
    const pStyle = p ? getComputedStyle(p) : null
    const span = p?.querySelector('span')
    const spanStyle = span ? getComputedStyle(span) : null

    return {
      pageWidth: pageRect?.width,
      pagePaddingLeft: pageStyle?.paddingLeft,
      pagePaddingRight: pageStyle?.paddingRight,
      editorWidth: editorRect?.width,
      firstParaLineHeight: pStyle?.lineHeight,
      firstParaFontSize: pStyle?.fontSize,
      spanFontSize: spanStyle?.fontSize,
      spanLineHeight: spanStyle?.lineHeight,
      spanInlineStyle: span?.getAttribute('style'),
      pInlineStyle: p?.getAttribute('style'),
    }
  })

  console.log('=== 导入后页面测量 ===')
  console.log(JSON.stringify(measurements, null, 2))

  const outPath = join(SCREENSHOTS_DIR, 'import-after-fix.png')
  await page.screenshot({ path: outPath, fullPage: false })
  console.log(`\n✅ Screenshot: ${outPath}`)

  await browser.close()
}

main().catch(err => { console.error(err.message); process.exit(1) })
