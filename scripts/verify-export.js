/**
 * verify-export.js — 导入测试 docx → 导出 → 用 python-docx 验证格式保真
 * 运行：node scripts/verify-export.js
 */
import { chromium } from 'playwright'
import { mkdirSync, existsSync } from 'fs'
import { execSync } from 'child_process'

const DIR = '/home/dx2331lxz/projects/docx-editor/screenshots'
mkdirSync(DIR, { recursive: true })

if (!existsSync('/tmp/test-format.docx')) {
  console.error('❌ /tmp/test-format.docx not found')
  process.exit(1)
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

page.on('console', msg => {
  if (msg.type() === 'error') console.error('[console.error]', msg.text())
})
page.on('pageerror', err => console.error('[pageerror]', err.message))

// Capture downloads
let downloadedPath = null
page.on('download', async download => {
  downloadedPath = '/tmp/exported-test.docx'
  await download.saveAs(downloadedPath)
  console.log('✅ Downloaded to', downloadedPath)
})

await page.setViewportSize({ width: 1440, height: 900 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForSelector('.ProseMirror', { timeout: 10000 })
await page.waitForTimeout(500)

// Step 1: import test docx
const fileInput = await page.$('input[type="file"][accept*=".docx"], input[type="file"]')
if (!fileInput) { console.error('❌ No file input'); await browser.close(); process.exit(1) }
await fileInput.setInputFiles('/tmp/test-format.docx')
await page.waitForTimeout(2500)
console.log('✅ Imported /tmp/test-format.docx')
await page.screenshot({ path: `${DIR}/export-01-imported.png` })

// Step 2: click export button
const exportBtn = await page.$('button[title*="导出"]')
if (!exportBtn) { console.error('❌ Export button not found'); await browser.close(); process.exit(1) }
await exportBtn.click()
await page.waitForTimeout(3000)
console.log('✅ Export button clicked')
await page.screenshot({ path: `${DIR}/export-02-after-export.png` })
await browser.close()

if (!downloadedPath || !existsSync(downloadedPath)) {
  console.error('⚠ No download captured. The export may have failed or used a different method.')
  process.exit(1)
}

// Step 3: inspect with python-docx
console.log('\n=== python-docx 验证结果 ===')
try {
  const result = execSync(`python3 -c "
from docx import Document

doc = Document('/tmp/exported-test.docx')
print('--- Paragraphs ---')
for i, p in enumerate(doc.paragraphs[:12]):
    text = repr(p.text[:35])
    style = p.style.name if p.style else 'None'
    align = str(p.alignment)
    print(f'  [{i}] style={style!r:20} align={align} {text}')
    for j, r in enumerate(p.runs):
        size_pt = r.font.size.pt if r.font.size else None
        try:
            color = str(r.font.color.rgb) if r.font.color and r.font.color.type else None
        except:
            color = None
        print(f'      run[{j}]: bold={r.bold} italic={r.italic} underline={r.underline} size={size_pt}pt font={r.font.name!r} color={color} text={repr(r.text[:15])}')
print()
print('--- Tables ---')
for t in doc.tables:
    for row in t.rows:
        print('  row:', [c.text for c in row.cells])
"`, { encoding: 'utf-8' })
  console.log(result)

  // Summary assessment
  const lines = result
  const checks = {
    'H1/H2 标题样式':      /Heading [12]/.test(lines),
    '加粗':                /bold=True/.test(lines),
    '斜体':                /italic=True/.test(lines),
    '下划线':              /underline=True/.test(lines),
    '字号(不为None)':      /size=\d+\.?\d*pt/.test(lines),
    '字体名称':            /font='(?!None)[^']+/.test(lines),
    '颜色(非空)':          /color=[0-9A-Fa-f]{6}/.test(lines),
    '居中对齐':            /CENTER/.test(lines),
    '表格存在':            /row:/.test(lines),
    '列表项内容':          /列表项[12]/.test(lines),
    '有序列表内容':        /列表项3/.test(lines),
  }

  console.log('=== 导出格式评分 ===')
  let passed = 0
  for (const [label, ok] of Object.entries(checks)) {
    console.log(` ${ok ? '✅' : '❌'} ${label}`)
    if (ok) passed++
  }
  console.log(`\n${passed}/${Object.keys(checks).length} 项通过`)
} catch (err) {
  console.error('python3 check failed:', err.message)
}
