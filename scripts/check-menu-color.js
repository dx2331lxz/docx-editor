import { chromium } from 'playwright'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.setViewportSize({ width: 1280, height: 900 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForSelector('.ProseMirror', { timeout: 10000 })
await page.waitForTimeout(500)

const fileMenu = await page.$('text=文件')
await fileMenu.click()
await page.waitForTimeout(500)

// 找到菜单项按钮，检查实际渲染颜色
const firstItem = await page.$('text=新建')
if (firstItem) {
  const color = await firstItem.evaluate(el => window.getComputedStyle(el).color)
  const bgColor = await firstItem.evaluate(el => {
    let node = el
    while (node) {
      const bg = window.getComputedStyle(node).backgroundColor
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg
      node = node.parentElement
    }
    return 'unknown'
  })
  console.log('文字颜色:', color)
  console.log('背景颜色:', bgColor)
  
  // 检查 inline style
  const inlineStyle = await firstItem.evaluate(el => {
    let node = el
    while (node) {
      if (node.getAttribute && node.getAttribute('style')?.includes('color')) {
        return node.getAttribute('style')
      }
      node = node.parentElement
    }
    return 'none'
  })
  console.log('找到的 inline style:', inlineStyle)
}

await browser.close()
