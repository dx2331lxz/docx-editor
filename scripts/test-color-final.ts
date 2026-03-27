/**
 * 颜色导出测试 - 最终版
 * 在浏览器中设置颜色 → 导出 → 检查
 */

import { chromium } from 'playwright'
import { execSync } from 'child_process'

async function main() {
  console.log('🎨 颜色导出测试\n')
  
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1440, height: 900 })
  
  // 打开编辑器
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
  await page.waitForSelector('.ProseMirror', { timeout: 10000 })
  
  // 清空内容
  await page.click('.ProseMirror')
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Delete')
  await page.waitForTimeout(100)
  
  // 输入带颜色的测试内容
  const testContent = `
红色文字测试
绿色文字测试
蓝色文字测试
`
  await page.keyboard.type(testContent)
  
  // 截图
  await page.screenshot({ path: 'screenshots/color-test-input.png' })
  console.log('✓ 输入完成，截图: screenshots/color-test-input.png')
  
  // 导出
  await page.click('text=文件')
  await page.waitForTimeout(300)
  
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=导出')
  ])
  
  await download.saveAs('/tmp/color-export-test.docx')
  console.log('✓ 已导出: /tmp/color-export-test.docx')
  
  // 检查导出结果
  const result = execSync(
    `python3 ~/projects/docx-editor/scripts/verify-export-styles.py /tmp/color-export-test.docx`,
    { encoding: 'utf-8' }
  )
  
  console.log('\n' + result)
  
  await browser.close()
}

main().catch(e => {
  console.error('❌ 错误:', e.message)
  process.exit(1)
})