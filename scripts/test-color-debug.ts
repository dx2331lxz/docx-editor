/**
 * 颜色导出测试 - 调试版
 */

import { writeFileSync } from 'fs'
import { execSync } from 'child_process'

// 在 Node.js 环境提供 DOMParser
import { parseHTML } from 'linkedom'
// @ts-ignore
globalThis.DOMParser = parseHTML('').DOMParser

async function main() {
  console.log('=' .repeat(60))
  console.log('🎨 颜色导出测试（调试版）')
  console.log('=' .repeat(60))
  
  try {
    // 导入导出函数
    const { exportDocx } = await import('../src/utils/docxHandler.ts')
    
    const html = '<p><span style="color:#FF0000">红色文字</span></p>'
    console.log('\n测试 HTML:', html)
    
    // 提供完整的 pageConfig
    const pageConfig = {
      paperSize: 'A4',
      orientation: 'portrait',
      marginTop: 25.4,
      marginBottom: 25.4,
      marginLeft: 31.8,
      marginRight: 31.8,
      width: 210,
      height: 297
    }
    
    // 导出
    const blob = await exportDocx({ title: '测试' }, pageConfig, html)
    const buffer = Buffer.from(await blob.arrayBuffer())
    
    writeFileSync('/tmp/color-test-debug.docx', buffer)
    console.log('✅ 导出成功: /tmp/color-test-debug.docx')
    
    // 检查颜色
    const output = execSync(
      `python3 ~/projects/docx-editor/scripts/verify-export-styles.py /tmp/color-test-debug.docx`,
      { encoding: 'utf-8' }
    )
    console.log(output)
    
  } catch (e) {
    console.log('❌ 错误:', e.message)
    console.log('\n堆栈:', e.stack)
  }
}

main()