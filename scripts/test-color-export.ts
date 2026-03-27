/**
 * 颜色导出测试（Playwright 版）- 修复版
 */

import { chromium } from 'playwright'
import { writeFileSync } from 'fs'
import { execSync } from 'child_process'

const TEST_COLORS = [
  { name: '红色', hex: '#FF0000' },
  { name: '绿色', hex: '#00FF00' },
  { name: '蓝色', hex: '#0000FF' },
]

async function main() {
  console.log('=' .repeat(60))
  console.log('🎨 颜色导出测试')
  console.log('=' .repeat(60))
  
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1440, height: 900 })
  
  console.log('\n1. 打开编辑器...')
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
  await page.waitForSelector('.ProseMirror', { timeout: 10000 })
  console.log('   ✓ 编辑器已加载')
  
  // 先检查 editor 实例
  const editorExists = await page.evaluate(() => {
    // @ts-ignore
    return typeof window.__EDITOR__ !== 'undefined'
  })
  console.log(`   editor 实例存在: ${editorExists}`)
  
  // 如果 __EDITOR__ 不存在，尝试从 React 组件获取
  if (!editorExists) {
    console.log('   尝试从 ProseMirror 获取 editor...')
    await page.evaluate(() => {
      // @ts-ignore
      const pm = document.querySelector('.ProseMirror')?.__vue__?.$data?.editor
      if (pm) {
        // @ts-ignore
        window.__EDITOR__ = pm
      }
    })
  }
  
  // 方案1：直接操作 DOM + 事件
  console.log('\n2. 创建测试内容...')
  
  // 点击编辑器聚焦
  await page.click('.ProseMirror')
  await page.waitForTimeout(100)
  
  // 全选并删除（Ctrl+A, Delete）
  await page.keyboard.press('Control+a')
  await page.waitForTimeout(50)
  await page.keyboard.press('Delete')
  await page.waitForTimeout(100)
  
  // 输入测试内容
  for (const tc of TEST_COLORS) {
    // 输入文字
    await page.keyboard.type(`${tc.name}文字测试`)
    await page.waitForTimeout(50)
    
    // 选中刚输入的文字
    await page.keyboard.press('Shift+Home')
    await page.waitForTimeout(50)
    
    // 点击颜色按钮
    const colorBtn = page.locator('button[title*="颜色"]').first()
    if (await colorBtn.isVisible()) {
      await colorBtn.click()
      await page.waitForTimeout(100)
      
      // 输入颜色值
      const colorInput = page.locator('input[type="color"]').first()
      if (await colorInput.isVisible()) {
        await colorInput.fill(tc.hex)
        await page.waitForTimeout(50)
        await page.keyboard.press('Escape')
      }
    }
    
    // 换行
    await page.keyboard.press('End')
    await page.waitForTimeout(50)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(50)
  }
  
  // 截图查看当前内容
  await page.screenshot({ path: 'screenshots/color-test-content.png', fullPage: false })
  console.log('   ✓ 截图: screenshots/color-test-content.png')
  
  // 获取编辑器 HTML
  const editorHtml = await page.evaluate(() => {
    // @ts-ignore
    return window.__EDITOR__?.getHTML() || document.querySelector('.ProseMirror')?.innerHTML || ''
  })
  console.log('\n   编辑器 HTML:')
  console.log('   ' + editorHtml.slice(0, 300) + '...')
  
  // 点击文件菜单 → 导出
  console.log('\n3. 导出 docx...')
  
  // 点击文件菜单
  await page.click('text=文件')
  await page.waitForTimeout(200)
  
  // 点击导出
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.click('text=导出 docx')
  ])
  
  const downloadPath = '/tmp/color-test-exported.docx'
  await download.saveAs(downloadPath)
  console.log(`   ✓ 文件保存: ${downloadPath}`)
  
  // 检查颜色
  console.log('\n4. 检查导出的颜色...')
  
  const pythonScript = `
from docx import Document

doc = Document('/tmp/color-test-exported.docx')
print('段落数:', len(doc.paragraphs))
print()

for i, p in enumerate(doc.paragraphs):
    text = p.text[:40] if p.text else '(空)'
    print(f'段落 {i}: {text}')
    for j, r in enumerate(p.runs):
        color = str(r.font.color.rgb) if r.font.color.rgb else '无颜色'
        if r.text.strip():
            print(f'  run {j}: "{r.text[:20]}" → 颜色: {color}')
`
  
  const output = execSync(`python3 -c "${pythonScript}"`, { encoding: 'utf-8' })
  console.log(output)
  
  // 对比
  console.log('5. 对比结果...')
  const results = []
  
  for (const tc of TEST_COLORS) {
    const expectedHex = tc.hex.replace('#', '')
    const found = output.toUpperCase().includes(expectedHex)
    results.push({ name: tc.name, expected: expectedHex, passed: found })
    console.log(`   ${found ? '✅' : '❌'} ${tc.name}: 期望 ${expectedHex}, ${found ? '已找到' : '未找到'}`)
  }
  
  const passed = results.filter(r => r.passed).length
  console.log(`\n📊 结果: ${passed}/${TEST_COLORS.length} 通过`)
  
  await browser.close()
  return results
}

main().catch(console.error)
