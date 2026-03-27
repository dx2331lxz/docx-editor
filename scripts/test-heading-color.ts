/**
 * 标题颜色导出测试
 */

import { chromium } from 'playwright'
import { execSync } from 'child_process'

async function main() {
  console.log('📝 标题颜色导出测试\n')
  
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1440, height: 900 })
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
  await page.waitForSelector('.ProseMirror', { timeout: 10000 })
  
  // 清空并插入标题
  await page.click('.ProseMirror')
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Delete')
  await page.waitForTimeout(100)
  
  // 插入标题（不设置颜色）
  await page.keyboard.type('这是标题测试')
  await page.waitForTimeout(100)
  
  // 设置为标题1
  await page.keyboard.press('Control+a')
  await page.waitForTimeout(50)
  
  // 点击样式下拉框
  const styleBtn = (await page.locator('button').all())[11] // 样式列表按钮
  await styleBtn.click()
  await page.waitForTimeout(200)
  
  // 选择标题1
  await page.click('text=标题 1')
  await page.waitForTimeout(100)
  
  // 获取编辑器 HTML
  const html = await page.evaluate(() => {
    return document.querySelector('.ProseMirror')?.innerHTML || ''
  })
  console.log('编辑器 HTML:')
  console.log(html)
  
  // 导出
  console.log('\n导出中...')
  await page.click('text=文件')
  await page.waitForTimeout(300)
  
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=导出')
  ])
  
  await download.saveAs('/tmp/heading-color-test.docx')
  console.log('✓ 已导出: /tmp/heading-color-test.docx')
  
  // 检查颜色
  const result = execSync(
    `python3 ~/projects/docx-editor/scripts/verify-export-styles.py /tmp/heading-color-test.docx`,
    { encoding: 'utf-8' }
  )
  
  console.log('\n' + result)
  
  await browser.close()
}

main().catch(console.error)