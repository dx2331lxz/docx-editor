/**
 * 颜色导出端到端测试 - 调试版
 */

import { chromium } from 'playwright'
import { execSync } from 'child_process'

async function main() {
  console.log('🎨 颜色导出端到端测试（调试版）\n')
  
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1440, height: 900 })
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
  await page.waitForSelector('.ProseMirror', { timeout: 10000 })
  console.log('✓ 编辑器已加载')
  
  // 截图查看工具栏
  await page.screenshot({ path: 'screenshots/toolbar-debug.png', fullPage: false })
  console.log('✓ 工具栏截图: screenshots/toolbar-debug.png')
  
  // 列出所有按钮
  const buttons = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    return btns.map((btn, i) => ({
      index: i,
      title: btn.getAttribute('title') || btn.getAttribute('aria-label') || '',
      text: btn.textContent?.slice(0, 20) || '',
      hasColorInput: btn.querySelector('input[type="color"]') !== null
    }))
  })
  
  console.log('\n工具栏按钮:')
  buttons.forEach((btn, i) => {
    if (btn.title || btn.text || btn.hasColorInput) {
      console.log(`  ${i}: title="${btn.title}" text="${btn.text}" hasColorInput=${btn.hasColorInput}`)
    }
  })
  
  // 找到颜色按钮
  const colorButtons = buttons.filter(b => b.hasColorInput || b.title.includes('颜色') || b.title.includes('Color'))
  console.log(`\n找到 ${colorButtons.length} 个颜色相关按钮`)
  
  await browser.close()
}

main().catch(console.error)