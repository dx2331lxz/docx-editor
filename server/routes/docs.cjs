const express = require('express')
const fs = require('fs')
const path = require('path')
const router = express.Router()

const DOCS_DIR = path.join(__dirname, '../data/docs')
if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true })

function safeId(id) { return id.replace(/[^a-zA-Z0-9-_]/g, '_') }

router.get('/', (req, res) => {
  try {
    const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.json'))
    const docs = files.map(f => {
      try {
        const d = JSON.parse(fs.readFileSync(path.join(DOCS_DIR, f), 'utf8'))
        const stat = fs.statSync(path.join(DOCS_DIR, f))
        return { docId: d.docId, title: d.meta?.title || 'Untitled', updatedAt: d.updatedAt, size: stat.size }
      } catch { return null }
    }).filter(Boolean)
    res.json(docs)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/:docId', (req, res) => {
  const file = path.join(DOCS_DIR, `${safeId(req.params.docId)}.json`)
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' })
  try { res.json(JSON.parse(fs.readFileSync(file, 'utf8'))) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', (req, res) => {
  try {
    const { content, meta } = req.body
    const docId = req.body.docId || crypto.randomUUID()
    const file = path.join(DOCS_DIR, `${safeId(docId)}.json`)
    const record = { docId, content, meta: meta || {}, updatedAt: new Date().toISOString() }
    fs.writeFileSync(file, JSON.stringify(record, null, 2))
    res.json({ ok: true, docId, updatedAt: record.updatedAt })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:docId', (req, res) => {
  const file = path.join(DOCS_DIR, `${safeId(req.params.docId)}.json`)
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' })
  try { fs.unlinkSync(file); res.json({ ok: true }) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
