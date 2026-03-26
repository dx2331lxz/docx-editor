/**
 * verify-docx.js — 上传测试 docx，截图查看导入效果
 * 使用前确保 /tmp/test-format.docx 存在（用 python3 生成）
 *
 * 运行：node scripts/verify-docx.js
 */
import { chromium } from 'playwright'
import { mkdirSync, existsSync } from 'fs'

const DIR = '/home/dx2331lxz/projects/docx-editor/screenshots'
mkdirSync(DIR, { recursive: true })

if (!existsSync('/tmp/test-format.docx')) {
  console.error('❌ /tmp/test-format.docx not found. Run python3 to create it first:')
  console.error('   node scripts/verify-docx.sh')
  process.exit(1)
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

page.on('console', msg => {
  if (msg.type() === 'error') console.error('[console.error]', msg.text())
})
page.on('pageerror', err => console.error('[pageerror]', err.message))

await page.setViewportSize({ width: 1440, height: 900 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForSelector('.ProseMirror', { timeout: 10000 })
await page.waitForTimeout(500)

// Find file input (hidden input[type=file])
const fileInput = await page.$('input[type="file"][accept*=".docx"], input[type="file"]')
if (!fileInput) {
  console.error('❌ No file input found')
  await page.screenshot({ path: `${DIR}/docx-import-debug.png` })
  await browser.close()
  process.exit(1)
}

await fileInput.setInputFiles('/tmp/test-format.docx')
await page.waitForTimeout(2500)

await page.screenshot({ path: `${DIR}/docx-import-test.png` })
console.log('✅ Screenshot saved: screenshots/docx-import-test.png')

// Check which formats were preserved
const editorHtml = await page.$eval('.ProseMirror', el => el.innerHTML)
const checks = {
  '标题H1':        editorHtml.includes('<h1'),
  '标题H2':        editorHtml.includes('<h2'),
  '加粗':          editorHtml.includes('<strong'),
  '斜体':          editorHtml.includes('<em'),
  '下划线':        editorHtml.includes('<u'),
  '字体(font-family)': editorHtml.includes('font-family'),
  '字号(font-size)':   editorHtml.includes('font-size'),
  '颜色(color)':   editorHtml.includes('color:#') || editorHtml.includes('color: rgb'),
  '居中对齐':      editorHtml.includes('text-align: center') || editorHtml.includes('text-align:center'),
  '表格':          editorHtml.includes('<table') || editorHtml.includes('<td'),
  '无序列表':      editorHtml.includes('<ul') || editorHtml.includes('bulletList'),
  '有序列表':      editorHtml.includes('<ol') || editorHtml.includes('orderedList'),
}

console.log('\n=== docx 导入格式保真报告 ===')
let passed = 0
for (const [label, ok] of Object.entries(checks)) {
  console.log(` ${ok ? '✅' : '❌'} ${label}`)
  if (ok) passed++
}
console.log(`\n${passed}/${Object.keys(checks).length} 项通过`)

// Extract sample values
const fontMatch = editorHtml.match(/font-family[^;"]{0,40}/g)
const sizeMatch = editorHtml.match(/font-size[^;"]{0,30}/g)
const colorMatch = editorHtml.match(/color[^;:"]{0,25}/g)
if (fontMatch) console.log('\n字体样本:', fontMatch.slice(0, 3))
if (sizeMatch) console.log('字号样本:', sizeMatch.slice(0, 3))
if (colorMatch) console.log('颜色样本:', colorMatch.slice(0, 3))

await browser.close()
