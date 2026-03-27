#!/usr/bin/env node
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const html = await page.evaluate(() => document.querySelector('.ProseMirror')?.innerHTML?.slice(0, 5000) ?? 'NOT FOUND')
writeFileSync('/tmp/editor-html.txt', html)
await browser.close()
console.log('saved to /tmp/editor-html.txt')
