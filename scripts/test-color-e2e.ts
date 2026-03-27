/**
 * 颜色导出端到端测试
 */

import { chromium } from 'playwright'
import { execSync, writeFileSync } from 'child_process'
import { readFileSync } from 'fs'

async function main() {
  console.log('🎨 颜色导出端到端测试\n')
  
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1440, height: 900 })
  
  // 打开编辑器
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
  await page.waitForSelector('.ProseMirror', { timeout: 10000 })
  console.log('✓ 编辑器已加载')
  
  // 清空内容
  await page.click('.ProseMirror')
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Delete')
  await page.waitForTimeout(100)
  
  // 输入测试文字
  await page.keyboard.type('这是红色的文字')
  await page.waitForTimeout(50)
  
  // 选中文字
  await page.keyboard.press('Control+a')
  await page.waitForTimeout(50)
  
  // 获取编辑器 HTML（设置颜色前）
  const htmlBefore = await page.evaluate(() => {
    // @ts-ignore
    return document.querySelector('.ProseMirror')?.innerHTML || ''
  })
  console.log('\n设置颜色前的 HTML:')
  console.log(htmlBefore.slice(0, 200))
  
  // 点击颜色按钮
  const colorBtn = page.locator('button').filter({ hasText: 'A' }).first()
  await colorBtn.click()
  await page.waitForTimeout(200)
  
  // 截图查看颜色选择器
  await page.screenshot({ path: 'screenshots/color-picker.png' })
  console.log('\n✓ 颜色选择器已打开，截图: screenshots/color-picker.png')
  
  // 选择红色 (直接点击颜色输入框并输入)
  const colorInput = page.locator('input[type="color"]')
  if (await colorInput.isVisible()) {
    await colorInput.fill('#FF0000')
    await page.waitForTimeout(100)
    await page.keyboard.press('Escape')
  }
  
  // 获取编辑器 HTML（设置颜色后）
  const htmlAfter = await page.evaluate(() => {
    // @ts-ignore
    return document.querySelector('.ProseMirror')?.innerHTML || ''
  })
  console.log('\n设置颜色后的 HTML:')
  console.log(htmlAfter.slice(0, 300))
  
  // 截图查看效果
  await page.screenshot({ path: 'screenshots/color-after-set.png' })
  console.log('\n✓ 设置颜色后截图: screenshots/color-after-set.png')
  
  // 导出
  console.log('\n开始导出...')
  await page.click('text=文件')
  await page.waitForTimeout(300)
  
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.click('text=导出')
  ])
  
  const exportPath = '/tmp/color-e2e-test.docx'
  await download.saveAs(exportPath)
  console.log(`✓ 已导出: ${exportPath}`)
  
  // 检查导出结果
  const result = execSync(
    `python3 ~/projects/docx-editor/scripts/verify-export-styles.py ${exportPath}`,
    { encoding: 'utf-8' }
  )
  
  console.log('\n' + result)
  
  // 检查 XML
  const xml = execSync(`unzip -p ${exportPath} word/document.xml`, { encoding: 'utf-8' })
  console.log('\n检查颜色是否在 XML 中:')
  const hasRed = xml.includes('FF0000') || xml.includes('ff0000')
  console.log(`  包含 FF0000: ${hasRed ? '✅' : '❌'}`)
  
  if (!hasRed) {
    console.log('\n  XML 片段:')
    console.log(xml.slice(0, 500))
  }
  
  await browser.close()
}

main().catch(e => {
  console.error('❌ 错误:', e.message)
  process.exit(1)
})