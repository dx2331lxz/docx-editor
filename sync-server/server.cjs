/**
 * docx-editor sync server — tiny HTTP server (no dependencies)
 * POST /api/sync          → save document (body: { docId, content, meta })
 * GET  /api/sync/:docId   → load document
 * GET  /api/docs          → list all saved documents
 * GET  /api/health        → health check
 * Port: 3001
 */

const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 3011
const DATA_DIR = path.join(__dirname, 'data')

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())) } catch { resolve({}) } })
    req.on('error', reject)
  })
}

function send(res, status, data) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    })
    res.end(); return
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)
  const pathname = url.pathname

  // GET /api/health
  if (req.method === 'GET' && pathname === '/api/health') {
    return send(res, 200, { status: 'ok', time: Date.now() })
  }

  // GET /api/docs — list all documents
  if (req.method === 'GET' && pathname === '/api/docs') {
    try {
      const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
      const docs = files.map(f => {
        try {
          const d = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'))
          const stat = fs.statSync(path.join(DATA_DIR, f))
          return { docId: d.docId, title: d.meta?.title || 'Untitled', updatedAt: d.updatedAt, size: stat.size }
        } catch { return null }
      }).filter(Boolean)
      return send(res, 200, { docs })
    } catch (e) {
      return send(res, 500, { error: e.message })
    }
  }

  // GET /api/sync/:docId — load document
  if (req.method === 'GET' && pathname.startsWith('/api/sync/')) {
    const docId = decodeURIComponent(pathname.replace('/api/sync/', ''))
    const safeId = docId.replace(/[^a-zA-Z0-9-_]/g, '_')
    const file = path.join(DATA_DIR, `${safeId}.json`)
    if (!fs.existsSync(file)) return send(res, 404, { error: 'Document not found' })
    try {
      return send(res, 200, JSON.parse(fs.readFileSync(file, 'utf8')))
    } catch (e) {
      return send(res, 500, { error: e.message })
    }
  }

  // POST /api/sync — save document
  if (req.method === 'POST' && pathname === '/api/sync') {
    try {
      const body = await readBody(req)
      const docId = body.docId || 'default'
      const safeId = docId.replace(/[^a-zA-Z0-9-_]/g, '_')
      const file = path.join(DATA_DIR, `${safeId}.json`)
      const record = {
        docId,
        content: body.content,
        meta: body.meta || {},
        updatedAt: new Date().toISOString()
      }
      fs.writeFileSync(file, JSON.stringify(record, null, 2))
      return send(res, 200, { ok: true, docId, updatedAt: record.updatedAt })
    } catch (e) {
      return send(res, 500, { error: e.message })
    }
  }

  send(res, 404, { error: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`[sync-server] running on http://localhost:${PORT}`)
  console.log(`[sync-server] data dir: ${DATA_DIR}`)
})
