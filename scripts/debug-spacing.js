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
  if (fileInput) await fileInput.setInputFiles(DOCX_PATH)
  await page.waitForTimeout(3000)

  const data = await page.evaluate(() => {
    const editor = document.querySelector('.ProseMirror')
    if (!editor) return []
    
    const results = []
    const paragraphs = editor.querySelectorAll('p')
    for (let i = 0; i < Math.min(10, paragraphs.length); i++) {
      const p = paragraphs[i]
      const rect = p.getBoundingClientRect()
      const style = getComputedStyle(p)
      const text = (p.textContent || '').substring(0, 20)
      const span = p.querySelector('span')
      const spanStyle = span ? getComputedStyle(span) : null
      results.push({
        i,
        text,
        top: rect.top.toFixed(1),
        height: rect.height.toFixed(1),
        marginTop: style.marginTop,
        marginBottom: style.marginBottom,
        lineHeight: style.lineHeight,
        fontSize: style.fontSize,
        spanFontSize: spanStyle?.fontSize,
        spanFontFamily: spanStyle?.fontFamily?.substring(0, 40),
        inlineStyle: p.getAttribute('style') || '',
      })
    }
    return results
  })

  for (const r of data) {
    console.log(`p[${r.i}] "${r.text}"`)
    console.log(`  top=${r.top} height=${r.height} marginTop=${r.marginTop} marginBottom=${r.marginBottom}`)
    console.log(`  lineHeight=${r.lineHeight} fontSize=${r.fontSize}`)
    console.log(`  span: fontSize=${r.spanFontSize} fontFamily=${r.spanFontFamily}`)
    console.log(`  inline: ${r.inlineStyle}`)
  }

  // Take a screenshot showing first page
  await page.screenshot({ path: join(SCREENSHOTS_DIR, 'debug-spacing.png'), fullPage: false })
  await browser.close()
}

main().catch(err => { console.error(err.message); process.exit(1) })
