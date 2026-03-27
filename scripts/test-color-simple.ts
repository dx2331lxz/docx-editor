/**
 * 颜色导出测试 - 简化版
 * 直接在控制台操作编辑器，检查颜色存储和导出
 */

import { chromium } from 'playwright'
import { execSync } from 'child_process'

async function main() {
  console.log('=' .repeat(60))
  console.log('🎨 颜色导出测试（简化版）')
  console.log('=' .repeat(60))
  
  const browser = await chromium.launch({ headless: false }) // 显示浏览器方便调试
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1440, height: 900 })
  
  console.log('\n1. 打开编辑器...')
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
  await page.waitForSelector('.ProseMirror', { timeout: 10000 })
  
  // 检查 editor 实例
  const editorInfo = await page.evaluate(() => {
    // @ts-ignore
    const editor = window.__EDITOR__
    if (!editor) return { exists: false }
    
    // 清空并插入测试内容
    editor.chain().focus().clearContent().run()
    
    // 使用 TipTap 的 setColor 命令
    editor.chain()
      .focus()
      .insertContent('红色文字')
      .setTextSelection({ from: 1, to: 5 }) // 选中"红色文字"
      .setColor('#FF0000')
      .setTextSelection('end')
      .insertContent({ type: 'paragraph' })
      .insertContent('绿色文字')
      .setTextSelection({ from: 8, to: 12 })
      .setColor('#00FF00')
      .setTextSelection('end')
      .insertContent({ type: 'paragraph' })
      .insertContent('蓝色文字')
      .setTextSelection({ from: 15, to: 19 })
      .setColor('#0000FF')
      .run()
    
    return {
      exists: true,
      html: editor.getHTML()
    }
  })
  
  console.log(`   editor 存在: ${editorInfo.exists}`)
  if (editorInfo.html) {
    console.log('\n   编辑器 HTML:')
    console.log('   ' + editorInfo.html.slice(0, 500))
  }
  
  // 截图
  await page.screenshot({ path: 'screenshots/color-test-simple.png' })
  console.log('\n   ✓ 截图: screenshots/color-test-simple.png')
  
  if (!editorInfo.exists) {
    console.log('   ❌ editor 实例不存在，尝试其他方式...')
    
    // 备用方案：直接操作 DOM
    await page.click('.ProseMirror')
    await page.keyboard.press('Control+a')
    await page.keyboard.press('Delete')
    await page.keyboard.type('红色文字测试')
    
    // 手动设置颜色
    await page.evaluate(() => {
      const el = document.querySelector('.ProseMirror')
      if (el) {
        el.innerHTML = `
          <p><span style="color:#FF0000">红色文字</span></p>
          <p><span style="color:#00FF00">绿色文字</span></p>
          <p><span style="color:#0000FF">蓝色文字</span></p>
        `
      }
    })
  }
  
  // 等待用户查看
  await page.waitForTimeout(2000)
  
  // 导出
  console.log('\n2. 导出 docx...')
  
  try {
    // 点击文件菜单
    await page.click('text=文件', { timeout: 5000 })
    await page.waitForTimeout(500)
    
    // 截图菜单
    await page.screenshot({ path: 'screenshots/color-test-menu.png' })
    
    // 点击导出
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.click('text=导出', { timeout: 5000 })
    ])
    
    await download.saveAs('/tmp/color-test-final.docx')
    console.log('   ✓ 已导出: /tmp/color-test-final.docx')
  } catch (e) {
    console.log('   ❌ 导出失败:', e.message)
    
    // 尝试直接调用导出函数
    console.log('   尝试直接调用导出函数...')
    await page.evaluate(async () => {
      // @ts-ignore
      const editor = window.__EDITOR__
      if (editor) {
        const html = editor.getHTML()
        // 调用导出
        const { exportDocx } = await import('/src/utils/docxHandler.ts')
        const blob = await exportDocx({ title: '测试' }, {}, html)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'color-test-direct.docx'
        a.click()
      }
    })
  }
  
  // 检查结果
  console.log('\n3. 检查导出的文件...')
  
  const files = ['/tmp/color-test-final.docx', '/tmp/color-test-direct.docx']
  for (const file of files) {
    try {
      const output = execSync(`python3 ~/projects/docx-editor/scripts/verify-export-styles.py ${file}`, { encoding: 'utf-8' })
      console.log(`\n${file}:`)
      console.log(output)
    } catch (e) {
      // 文件不存在
    }
  }
  
  await browser.close()
}

main().catch(console.error)
