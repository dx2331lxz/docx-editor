/**
 * 颜色导出测试 - 纯 Node.js 版
 * 直接测试导出函数，不依赖浏览器
 */

import { writeFileSync } from 'fs'
import { execSync } from 'child_process'

// 在 Node.js 环境提供 DOMParser
import { parseHTML } from 'linkedom'
// @ts-ignore
globalThis.DOMParser = parseHTML('').DOMParser

// 测试 HTML 内容（带颜色）
const testCases = [
  {
    name: 'span 内联颜色',
    html: '<p><span style="color:#FF0000">红色文字</span></p><p><span style="color:#00FF00">绿色文字</span></p><p><span style="color:#0000FF">蓝色文字</span></p>'
  },
  {
    name: '段落级颜色',
    html: '<p style="color:#FF0000">段落级红色</p>'
  },
  {
    name: '标题颜色',
    html: '<h1 style="color:#FF0000">红色标题</h1><h2 style="color:#00FF00">绿色标题</h2>'
  },
  {
    name: 'rgb 格式',
    html: '<p><span style="color:rgb(255,0,0)">RGB红色</span></p>'
  },
  {
    name: '混合颜色',
    html: '<p><span style="color:#FF0000">红</span><span style="color:#00FF00">绿</span><span style="color:#0000FF">蓝</span></p>'
  }
]

async function main() {
  console.log('=' .repeat(60))
  console.log('🎨 颜色导出测试（纯 Node.js）')
  console.log('=' .repeat(60))
  
  // 导入导出函数
  const { exportDocx } = await import('../src/utils/docxHandler.ts')
  
  for (const tc of testCases) {
    console.log(`\n测试: ${tc.name}`)
    console.log(`  HTML: ${tc.html}`)
    
    try {
      // 导出
      const blob = await exportDocx({ title: tc.name }, {}, tc.html)
      const buffer = Buffer.from(await blob.arrayBuffer())
      
      const path = `/tmp/color-test-${tc.name.replace(/\s+/g, '-')}.docx`
      writeFileSync(path, buffer)
      
      // 用 python-docx 检查
      const output = execSync(
        `python3 -c "
from docx import Document
doc = Document('${path}')
colors = []
for p in doc.paragraphs:
    for r in p.runs:
        if r.font.color.rgb:
            colors.append(str(r.font.color.rgb))
print('|'.join(colors) if colors else '无颜色')
"`,
        { encoding: 'utf-8' }
      ).trim()
      
      console.log(`  导出颜色: ${output}`)
      
      // 检查是否包含期望的颜色
      const expectedColors = tc.html.match(/#[A-Fa-f0-9]{6}|rgb\(\d+,\s*\d+,\s*\d+\)/g) || []
      const found = expectedColors.some(c => {
        const hex = c.startsWith('#') ? c.slice(1).toUpperCase() : c
        return output.toUpperCase().includes(hex) || output.includes('无颜色') === false
      })
      
      console.log(`  结果: ${output !== '无颜色' ? '✅ 有颜色' : '❌ 无颜色'}`)
      
    } catch (e) {
      console.log(`  ❌ 错误: ${e.message}`)
    }
  }
  
  console.log('\n' + '=' .repeat(60))
  console.log('测试完成')
}

main().catch(console.error)
