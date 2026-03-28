const express = require('express')
const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const { URL } = require('url')
const router = express.Router()

const CONFIG_FILE = path.join(__dirname, '../data/config.json')
const DEFAULT_CONFIG = {
  endpoint: 'https://api.siliconflow.cn/v1/chat/completions',
  apiKey: '',
  model: 'Pro/moonshotai/Kimi-K2.5'
}

function readConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG }
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) } }
  catch { return { ...DEFAULT_CONFIG } }
}

router.post('/chat', (req, res) => {
  const cfg = readConfig()
  const body = { ...req.body, model: cfg.model }
  const bodyStr = JSON.stringify(body)
  const target = new URL(cfg.endpoint)
  const isHttps = target.protocol === 'https:'
  const options = {
    hostname: target.hostname,
    port: target.port || (isHttps ? 443 : 80),
    path: target.pathname + target.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.apiKey}`,
      'Content-Length': Buffer.byteLength(bodyStr),
    }
  }
  const transport = isHttps ? https : http
  const proxyReq = transport.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode || 200)
    const ct = proxyRes.headers['content-type']
    if (ct) res.setHeader('Content-Type', ct)
    const isStream = body.stream === true
    if (isStream) {
      res.setHeader('Transfer-Encoding', 'chunked')
    }
    proxyRes.pipe(res)
  })
  proxyReq.on('error', (e) => {
    if (!res.headersSent) res.status(502).json({ error: e.message })
  })
  proxyReq.write(bodyStr)
  proxyReq.end()
})

module.exports = router
