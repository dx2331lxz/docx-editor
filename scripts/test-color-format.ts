/**
 * 测试 TipTap Color 扩展的 HTML 输出格式
 */

import { chromium } from 'playwright'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1440, height: 900 })
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
  await page.waitForSelector('.ProseMirror', { timeout: 10000 })
  
  // 测试颜色设置的 HTML 输出
  const result = await page.evaluate(() => {
    // @ts-ignore
    const editor = window.__EDITOR__
    if (!editor) return { error: 'editor not found' }
    
    // 清空并插入测试内容
    editor.chain().focus().clearContent().run()
    
    // 方式1：使用 setColor 命令
    editor.chain().focus().insertContent('红色测试').run()
    editor.chain().focus().selectAll().setColor('#FF0000').run()
    
    const html1 = editor.getHTML()
    
    // 方式2：直接设置 textStyle 属性
    editor.chain().focus().clearContent().run()
    editor.chain().focus().insertContent({
      type: 'text',
      text: '直接设置颜色',
      marks: [{ type: 'textStyle', attrs: { color: '#00FF00' } }]
    }).run()
    
    const html2 = editor.getHTML()
    
    // 获取 JSON 格式
    const json1 = editor.getJSON()
    
    return { html1, html2, json1 }
  })
  
  console.log('测试结果：')
  console.log('\n方式1 (setColor):')
  console.log(result.html1)
  
  console.log('\n方式2 (直接设置 textStyle):')
  console.log(result.html2)
  
  console.log('\nJSON 格式:')
  console.log(JSON.stringify(result.json1, null, 2))
  
  await browser.close()
}

main().catch(console.error)