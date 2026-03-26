import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE = 'http://localhost:5173'

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setViewportSize({ width: 1440, height: 900 })
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)

// 1. 主页截图
await page.screenshot({ path: path.join(__dirname, '../screenshots/verify-main.png') })
console.log('✓ 主页截图')

// 2. 打开文件菜单（验证下拉不遮挡）
await page.click('text=文件')
await page.waitForTimeout(400)
await page.screenshot({ path: path.join(__dirname, '../screenshots/verify-menu-file.png') })
console.log('✓ 文件菜单截图')
await page.keyboard.press('Escape')
await page.waitForTimeout(200)

// 3. 打开视图菜单
await page.click('text=视图')
await page.waitForTimeout(400)
await page.screenshot({ path: path.join(__dirname, '../screenshots/verify-menu-view.png') })
console.log('✓ 视图菜单截图')
await page.keyboard.press('Escape')
await page.waitForTimeout(200)

// 4. 打开 Vibe Editing 侧边栏（尝试点击右上角按钮）
try {
  // 尝试多种选择器
  const vibeBtn = page.locator('button:has-text("Vibe"), [data-testid="vibe-btn"], button:has-text("✨")').first()
  await vibeBtn.click({ timeout: 3000 })
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(__dirname, '../screenshots/verify-vibe-open.png') })
  console.log('✓ Vibe 侧边栏截图')
  
  // 5. 在输入框输入多行文字，验证高度
  const textarea = page.locator('textarea').last()
  await textarea.fill('第一行文字\n第二行文字\n第三行文字\n第四行文字\n第五行文字')
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(__dirname, '../screenshots/verify-vibe-input.png') })
  console.log('✓ Vibe 输入框自适应截图')
} catch(e) {
  console.log('⚠ Vibe 按钮未找到:', e.message)
}

// 6. 检查页眉页脚区域
await page.keyboard.press('Escape')
await page.screenshot({ path: path.join(__dirname, '../screenshots/verify-header-footer.png') })
console.log('✓ 页眉页脚截图')

await browser.close()
console.log('✅ 所有验证截图完成')
