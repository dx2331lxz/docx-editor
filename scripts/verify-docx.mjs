/**
 * verify-docx.mjs — Playwright verification of docx import/export fidelity
 * Usage: node scripts/verify-docx.mjs
 * Prerequisites: dev server running at http://localhost:5173
 *                /tmp/test-format.docx exists (run scripts/verify-docx.sh first)
 */
import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DOCX_PATH = '/tmp/test-format.docx'
const SCREENSHOTS_DIR = resolve(__dirname, '../screenshots')
const BASE_URL = 'http://localhost:5173'

if (!existsSync(DOCX_PATH)) {
  console.error('❌ Test file not found. Run scripts/verify-docx.sh first.')
  process.exit(1)
}
mkdirSync(SCREENSHOTS_DIR, { recursive: true })

console.log('🔍 Starting docx import/export verification...\n')

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.setViewportSize({ width: 1440, height: 900 })

// ─── Step 1: Load the editor ─────────────────────────────────────────────────
console.log('[1/5] Opening editor...')
await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 })
await page.waitForSelector('.ProseMirror', { timeout: 10000 })
await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-initial.png` })
console.log('  ✅ Editor loaded → screenshots/01-initial.png')

// ─── Step 2: Import test docx ─────────────────────────────────────────────────
console.log('[2/5] Importing test docx...')

// Look for an import button or file input in the toolbar/menu
// Try multiple selectors for the import button
let importTriggered = false

// Try MenuBar import
const menuImportBtn = await page.$('button[title*="导入"], [data-tooltip*="导入"]')
if (menuImportBtn) {
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null),
    menuImportBtn.click(),
  ])
  if (fileChooser) {
    await fileChooser.setFiles(DOCX_PATH)
    importTriggered = true
    console.log('  → Used import button')
  }
}

// If no button found, look for a hidden file input
if (!importTriggered) {
  const fileInput = await page.$('input[type="file"][accept*=".docx"], input[type="file"][accept*="docx"]')
  if (fileInput) {
    await fileInput.setInputFiles(DOCX_PATH)
    importTriggered = true
    console.log('  → Used file input')
  }
}

if (!importTriggered) {
  // Try clicking File menu then looking for import option
  const fileMenu = await page.$('button:has-text("文件"), [data-menu="file"]')
  if (fileMenu) {
    await fileMenu.click()
    await page.waitForTimeout(500)
    const importOption = await page.$('text=导入, text=打开')
    if (importOption) {
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null),
        importOption.click(),
      ])
      if (fileChooser) {
        await fileChooser.setFiles(DOCX_PATH)
        importTriggered = true
        console.log('  → Used File menu > Import')
      }
    }
  }
}

if (!importTriggered) {
  console.log('  ⚠️  Could not trigger file import UI, trying drag-and-drop approach...')
  // Last resort: drag-and-drop onto editor
  const editor = await page.$('.ProseMirror')
  if (editor) {
    await page.evaluate(async (docxPath) => {
      const response = await fetch(docxPath)
      const blob = await response.blob()
      const file = new File([blob], 'test-format.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      const dropEvent = new DragEvent('drop', { dataTransfer, bubbles: true })
      document.querySelector('.ProseMirror')?.dispatchEvent(dropEvent)
    }, DOCX_PATH)
  }
}

await page.waitForTimeout(2000)
await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-after-import.png`, fullPage: false })
console.log('  ✅ Import attempted → screenshots/02-after-import.png')

// ─── Step 3: Check editor content ─────────────────────────────────────────────
console.log('[3/5] Checking imported content...')
const editorHtml = await page.evaluate(() => {
  const el = document.querySelector('.ProseMirror')
  return el?.innerHTML ?? ''
})

const checks = [
  ['标题一级 (h1/h2)',   /<h[12]/i.test(editorHtml)],
  ['加粗文字 (strong)',  /<strong>/i.test(editorHtml)],
  ['斜体文字 (em)',      /<em>/i.test(editorHtml)],
  ['下划线文字 (u)',     /<u>/i.test(editorHtml)],
  ['字体颜色 (color)',   /color\s*:/i.test(editorHtml)],
  ['字体名称 (font-family)', /font-family/i.test(editorHtml)],
  ['字号 (font-size)',   /font-size/i.test(editorHtml)],
  ['表格 (table)',       /<table/i.test(editorHtml)],
  ['列表 (ul/ol/li)',    /<[uo]l|<li/i.test(editorHtml)],
]

console.log('  Content check results:')
checks.forEach(([name, found]) => {
  console.log(`    ${found ? '✅' : '❌'} ${name}`)
})

// ─── Step 4: Full page screenshot ─────────────────────────────────────────────
console.log('[4/5] Taking full editor screenshot...')
await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-import-full.png`, fullPage: true })
console.log('  ✅ Full screenshot → screenshots/03-import-full.png')

// ─── Step 5: Vibe panel visibility test ───────────────────────────────────────
console.log('[5/5] Testing Vibe panel height...')
const vibeBtn = await page.$('[title*="Vibe"], button:has-text("Vibe")')
if (vibeBtn) {
  await vibeBtn.click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-vibe-panel.png` })
  const panelBox = await page.evaluate(() => {
    const panel = document.querySelector('[class*="vibe"], [data-panel="vibe"]')
    if (!panel) return null
    const rect = panel.getBoundingClientRect()
    const viewport = { w: window.innerWidth, h: window.innerHeight }
    return { top: rect.top, bottom: rect.bottom, height: rect.height, viewport }
  })
  if (panelBox) {
    const fillsPct = Math.round((panelBox.height / panelBox.viewport.h) * 100)
    console.log(`  Vibe panel: top=${panelBox.top}px bottom=${panelBox.bottom}px height=${panelBox.height}px (${fillsPct}% of viewport)`)
    console.log(`  ${fillsPct > 85 ? '✅' : '⚠️ '} Panel ${fillsPct > 85 ? 'fills' : 'does NOT fill'} viewport height`)
  } else {
    console.log('  ⚠️  Could not measure panel (selector not found)')
  }
  console.log('  ✅ Vibe panel screenshot → screenshots/04-vibe-panel.png')
}

await browser.close()
console.log('\n✅ Verification complete! Screenshots saved to screenshots/')
