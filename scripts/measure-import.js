#!/usr/bin/env node
import { chromium } from 'playwright'

const URL = 'http://localhost:3011'
const DOCX_PATH = '/home/dx2331lxz/.openclaw/workspace/docs/代码重构社会.docx'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForSelector('.ProseMirror', { timeout: 10000 })
  await page.waitForTimeout(1000)

  const fileInput = await page.$('input[type="file"]')
  if (fileInput) await fileInput.setInputFiles(DOCX_PATH)
  await page.waitForTimeout(3000)

  // Measure actual character widths on screen
  const data = await page.evaluate(() => {
    const editor = document.querySelector('.ProseMirror')
    if (!editor) return { error: 'no editor' }

    // Get the page/container width
    const pageEl = editor.closest('[class*="page"]') || editor.parentElement
    const containerWidth = pageEl ? pageEl.getBoundingClientRect().width : 0

    const results = []
    const paragraphs = editor.querySelectorAll('p')
    
    for (let i = 0; i < Math.min(8, paragraphs.length); i++) {
      const p = paragraphs[i]
      const pStyle = getComputedStyle(p)
      const text = p.textContent || ''
      
      // Check the first span inside
      const firstSpan = p.querySelector('span')
      const spanStyle = firstSpan ? getComputedStyle(firstSpan) : null
      
      // Get the inline style attribute
      const pInlineStyle = p.getAttribute('style') || '(none)'
      const spanInlineStyle = firstSpan ? (firstSpan.getAttribute('style') || '(none)') : '(no span)'
      
      results.push({
        index: i,
        text: text.substring(0, 30),
        textLength: text.length,
        pWidth: p.getBoundingClientRect().width,
        pFontSize: pStyle.fontSize,
        pFontFamily: pStyle.fontFamily.substring(0, 60),
        pLineHeight: pStyle.lineHeight,
        spanFontSize: spanStyle?.fontSize,
        spanFontFamily: spanStyle?.fontFamily?.substring(0, 60),
        pInlineStyle,
        spanInlineStyle,
      })
    }

    return { containerWidth, results }
  })

  console.log('Container width:', data.containerWidth, 'px')
  console.log('')
  for (const r of data.results) {
    console.log(`--- 段落 ${r.index} ---`)
    console.log(`  文本: ${r.text}... (${r.textLength} chars)`)
    console.log(`  p 宽度: ${r.pWidth}px`)
    console.log(`  p computed: font-size=${r.pFontSize}, font-family=${r.pFontFamily}`)
    console.log(`  p line-height: ${r.pLineHeight}`)
    console.log(`  p inline style: ${r.pInlineStyle}`)
    console.log(`  span computed: font-size=${r.spanFontSize}, font-family=${r.spanFontFamily}`)
    console.log(`  span inline style: ${r.spanInlineStyle}`)
  }
  
  await browser.close()
}

main().catch(err => {
  console.error('Failed:', err.message)
  process.exit(1)
})
