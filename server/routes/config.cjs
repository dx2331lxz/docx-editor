const express = require('express')
const fs = require('fs')
const path = require('path')
const router = express.Router()

const CONFIG_FILE = path.join(__dirname, '../data/config.json')
const DATA_DIR = path.join(__dirname, '../data')

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

router.get('/', (req, res) => {
  const cfg = readConfig()
  const masked = cfg.apiKey ? cfg.apiKey.slice(0, 4) + '****' : ''
  res.json({ endpoint: cfg.endpoint, apiKey: masked, model: cfg.model })
})

router.post('/', (req, res) => {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    const current = readConfig()
    const { endpoint, apiKey, model } = req.body
    const updated = {
      endpoint: endpoint ?? current.endpoint,
      apiKey: apiKey !== undefined && apiKey !== '' && !apiKey.endsWith('****') ? apiKey : current.apiKey,
      model: model ?? current.model
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2))
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
