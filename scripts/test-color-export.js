/**
 * 颜色导出测试脚本
 * 生成带颜色的测试内容 → 导出 docx → 检查颜色是否正确
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
import { writeFileSync, readFileSync } from 'fs'
import { execSync } from 'child_process'

// 测试用例：各种颜色场景
const testCases = [
  { name: '纯红色', html: '<p><span style="color:#FF0000">这是红色文字</span></p>', expectedColor: 'FF0000' },
  { name: '纯绿色', html: '<p><span style="color:#00FF00">这是绿色文字</span></p>', expectedColor: '00FF00' },
  { name: '纯蓝色', html: '<p><span style="color:#0000FF">这是蓝色文字</span></p>', expectedColor: '0000FF' },
  { name: 'rgb格式红色', html: '<p><span style="color:rgb(255,0,0)">RGB红色文字</span></p>', expectedColor: 'FF0000' },
  { name: '段落级颜色', html: '<p style="color:#FF0000">段落级红色文字</p>', expectedColor: 'FF0000' },
  { name: '标题颜色', html: '<h1 style="color:#FF0000">红色标题</h1>', expectedColor: 'FF0000' },
  { name: '混合颜色', html: '<p><span style="color:#FF0000">红色</span><span style="color:#00FF00">绿色</span><span style="color:#0000FF">蓝色</span></p>', expectedColors: ['FF0000', '00FF00', '0000FF'] },
  { name: '嵌套颜色', html: '<p style="color:#FF0000"><span style="color:#00FF00">绿色覆盖红色</span></p>', expectedColor: '00FF00' },
]

// 导入导出函数
async function runTest() {
  console.log('=' .repeat(60))
  console.log('🎨 颜色导出测试')
  console.log('=' .repeat(60))
  
  // 动态导入导出函数
  const { exportDocx } = await import('../src/utils/docxHandler.ts')
  
  const results = []
  
  for (const tc of testCases) {
    console.log(`\n测试: ${tc.name}`)
    console.log(`  HTML: ${tc.html}`)
    
    try {
      // 创建简单的文档对象（模拟 editor.getHTML() 的输出）
      const fullHtml = `<!DOCTYPE html><html><body>${tc.html}</body></html>`
      
      // 导出 docx
      const docxBlob = await exportDocx({ title: '颜色测试' }, {}, tc.html)
      const buffer = await docxBlob.arrayBuffer()
      
      // 保存到临时文件
      const tmpPath = `/tmp/color-test-${Date.now()}.docx`
      writeFileSync(tmpPath, Buffer.from(buffer))
      
      // 用 python-docx 检查颜色
      const pythonScript = `
from docx import Document
import sys

doc = Document('${tmpPath}')
colors = []
for p in doc.paragraphs:
    for r in p.runs:
        if r.font.color.rgb:
            colors.append(str(r.font.color.rgb))
        else:
            colors.append('无颜色')
print('|'.join(colors))
`
      const output = execSync(`python3 -c "${pythonScript.replace(/'/g, "'\"'\"'")}"`, { encoding: 'utf-8' }).trim()
      const actualColors = output.split('|')
      
      // 验证
      let passed = false
      if (tc.expectedColors) {
        passed = JSON.stringify(actualColors) === JSON.stringify(tc.expectedColors)
      } else if (tc.expectedColor) {
        passed = actualColors.includes(tc.expectedColor)
      }
      
      results.push({
        name: tc.name,
        passed,
        expected: tc.expectedColors || [tc.expectedColor],
        actual: actualColors,
      })
      
      console.log(`  期望: ${tc.expectedColors || [tc.expectedColor]}`)
      console.log(`  实际: ${actualColors}`)
      console.log(`  结果: ${passed ? '✅ 通过' : '❌ 失败'}`)
      
    } catch (error) {
      console.log(`  ❌ 错误: ${error.message}`)
      results.push({ name: tc.name, passed: false, error: error.message })
    }
  }
  
  console.log('\n' + '=' .repeat(60))
  console.log('📊 测试结果汇总')
  console.log('=' .repeat(60))
  
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  
  results.forEach(r => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name}`)
    if (!r.passed && r.expected) {
      console.log(`   期望: ${r.expected}`)
      console.log(`   实际: ${r.actual}`)
    }
  })
  
  console.log(`\n总计: ${passed} 通过 / ${failed} 失败`)
  
  return { passed, failed, results }
}

runTest().catch(console.error)
