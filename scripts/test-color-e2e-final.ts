/**
 * 颜色导出端到端测试 - 最终版
 */

import { chromium } from 'playwright'
import { execSync } from 'child_process'

async function main() {
  console.log('🎨 颜色导出端到端测试\n')
  
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1440, height: 900 })
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
  await page.waitForSelector('.ProseMirror', { timeout: 10000 })
  console.log('✓ 编辑器已加载')
  
  // 清空并输入测试文字
  await page.click('.ProseMirror')
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Delete')
  await page.waitForTimeout(100)
  
  await page.keyboard.type('这是红色的文字')
  await page.waitForTimeout(100)
  
  // 选中文字
  await page.keyboard.press('Control+a')
  await page.waitForTimeout(100)
  
  // 点击字体颜色按钮 (索引 19)
  const colorBtn = (await page.locator('button').all())[19]
  await colorBtn.click()
  await page.waitForTimeout(200)
  
  // 截图
  await page.screenshot({ path: 'screenshots/color-btn-clicked.png' })
  console.log('✓ 颜色按钮点击后截图')
  
  // 找到颜色输入框并设置红色
  const colorInput = page.locator('input[type="color"]')
  if (await colorInput.count() > 0) {
    await colorInput.first().fill('#FF0000')
    await page.waitForTimeout(100)
    console.log('✓ 已设置颜色为红色')
    
    // 点击空白处关闭
    await page.click('.ProseMirror', { position: { x: 10, y: 10 } })
    await page.waitForTimeout(100)
  }
  
  // 获取编辑器 HTML
  const html = await page.evaluate(() => {
    return document.querySelector('.ProseMirror')?.innerHTML || ''
  })
  console.log('\n编辑器 HTML:')
  console.log(html)
  
  // 截图最终效果
  await page.screenshot({ path: 'screenshots/color-final.png' })
  
  // 导出
  console.log('\n开始导出...')
  await page.click('text=文件')
  await page.waitForTimeout(300)
  
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.click('text=导出')
  ])
  
  const exportPath = '/tmp/color-e2e-final.docx'
  await download.saveAs(exportPath)
  console.log(`✓ 已导出: ${exportPath}`)
  
  // 用 python-docx 检查
  const result = execSync(
    `python3 ~/projects/docx-editor/scripts/verify-export-styles.py ${exportPath}`,
    { encoding: 'utf-8' }
  )
  
  console.log('\n' + result)
  
  // 检查 XML 中是否有颜色
  const xml = execSync(`unzip -p ${exportPath} word/document.xml`, { encoding: 'utf-8' })
  const hasRed = xml.includes('FF0000') || xml.includes('ff0000')
  console.log(`\n检查 XML: ${hasRed ? '✅ 包含红色' : '❌ 不包含红色'}`)
  
  if (hasRed) {
    console.log('\n✅ 颜色导出成功！')
  } else {
    console.log('\n❌ 颜色导出失败，检查 HTML:')
    console.log(html)
  }
  
  await browser.close()
}

main().catch(e => {
  console.error('❌ 错误:', e.message)
  process.exit(1)
})