/**
 * 调试 htmlToDocxChildren
 */

import { parseHTML } from 'linkedom'

// 用 linkedom 的 parseHTML 直接解析
function debugHtmlToDocx(html: string) {
  // 用完整的 HTML 文档解析
  const fullHtml = `<!DOCTYPE html><html><body>${html}</body></html>`
  const { document } = parseHTML(fullHtml)
  
  console.log('解析后的 DOM:')
  console.log('body.innerHTML:', document.body.innerHTML)
  console.log('body.children.length:', document.body.children.length)
  
  Array.from(document.body.children).forEach((child, i) => {
    console.log(`\nchild ${i}:`, child.tagName, child.textContent?.slice(0, 30))
    console.log('  attributes:', Array.from(child.attributes).map(a => `${a.name}="${a.value}"`).join(', '))
    
    // 检查子节点
    Array.from(child.childNodes).forEach((sub, j) => {
      if (sub.nodeType === 1) { // Element
        console.log(`  sub ${j}: <${sub.tagName}>`, sub.textContent)
      } else if (sub.nodeType === 3) { // Text
        console.log(`  sub ${j}: TEXT "${sub.textContent}"`)
      }
    })
  })
}

const html = '<p><span style="color:#FF0000">红色文字</span></p>'
console.log('测试 HTML:', html)
console.log('=' .repeat(60))

debugHtmlToDocx(html)