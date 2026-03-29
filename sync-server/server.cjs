/**
 * docx-editor sync server — tiny HTTP server (no dependencies)
 *
 * Legacy sync API:
 *   POST /api/sync          → save document (body: { docId, content, meta })
 *   GET  /api/sync/:docId   → load document
 *   GET  /api/docs          → list all saved documents (legacy)
 *   GET  /api/health        → health check
 *
 * File API (.docx storage):
 *   GET    /api/files           → list all .docx files [{id,name,size,updatedAt}]
 *   GET    /api/files/:id       → download .docx file
 *   POST   /api/files           → upload/save .docx (multipart/form-data, field: file, optional: name)
 *   PUT    /api/files/:id/name  → rename (body: { name })
 *   DELETE /api/files/:id       → delete
 *
 * Sessions API (AI chat history):
 *   GET    /api/sessions        → list sessions [{id,title,model,createdAt,updatedAt,messageCount}]
 *   GET    /api/sessions/:id    → get session detail (with messages)
 *   POST   /api/sessions        → create session (body: { title, model, messages })
 *   PUT    /api/sessions/:id    → update session (body: { title?, messages? })
 *   DELETE /api/sessions/:id    → delete session
 *
 * Port: 3011
 */

const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 3011
const DATA_DIR = path.join(__dirname, 'data')
const DOCS_DIR = path.join(__dirname, 'docs')
const SESSIONS_DIR = path.join(__dirname, 'sessions')

// Ensure directories exist
for (const dir of [DATA_DIR, DOCS_DIR, SESSIONS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function readBodyBuffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function readBody(req) {
  return readBodyBuffer(req).then(buf => {
    try { return JSON.parse(buf.toString()) } catch { return {} }
  })
}

/** Split a Buffer by a delimiter Buffer, returning an array of Buffers. */
function splitBuffer(buf, delimiter) {
  const parts = []
  let start = 0
  while (true) {
    const idx = buf.indexOf(delimiter, start)
    if (idx === -1) { parts.push(buf.slice(start)); break }
    parts.push(buf.slice(start, idx))
    start = idx + delimiter.length
  }
  return parts
}

/** Parse multipart/form-data body. Returns { fields: {name: string}, files: {name: {data: Buffer, filename: string}} } */
function parseMultipart(body, boundary) {
  const delim = Buffer.from('\r\n--' + boundary)
  const parts = splitBuffer(body, delim)
  const fields = {}
  const files = {}
  for (const part of parts) {
    // Each part starts with \r\n (from boundary) except the very first
    const headerBodySep = part.indexOf('\r\n\r\n')
    if (headerBodySep === -1) continue
    const headerStr = part.slice(0, headerBodySep).toString('utf8').replace(/^\r\n/, '')
    const bodyBuf = part.slice(headerBodySep + 4)
    // Trim trailing \r\n-- or --\r\n at end of last part
    const trimmed = bodyBuf.slice(-2).toString() === '--' ? bodyBuf.slice(0, -4) :
                    bodyBuf.slice(-2).toString() === '\r\n' ? bodyBuf.slice(0, -2) : bodyBuf

    const dispMatch = headerStr.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]*)")?/i)
    if (!dispMatch) continue
    const name = dispMatch[1]
    const filename = dispMatch[2]
    if (filename !== undefined) {
      files[name] = { data: trimmed, filename }
    } else {
      fields[name] = trimmed.toString('utf8')
    }
  }
  return { fields, files }
}

/** Convert a display name to a slug id (no extension). */
function nameToSlug(name) {
  return name
    .replace(/\.docx$/i, '')
    .trim()
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80) || 'document'
}

/** Generate a unique id in DOCS_DIR for the given base slug. */
function uniqueDocId(base) {
  const existing = fs.readdirSync(DOCS_DIR).map(f => f.replace(/\.docx$/i, ''))
  if (!existing.includes(base)) return base
  let n = 2
  while (existing.includes(`${base}_${n}`)) n++
  return `${base}_${n}`
}

/** Generate a unique session id. */
function newSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function send(res, status, data) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

function sendFile(res, filePath, contentType) {
  try {
    const data = fs.readFileSync(filePath)
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': data.length,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    })
    res.end(data)
  } catch (e) {
    send(res, 500, { error: e.message })
  }
}

// ── Request handler ───────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end(); return
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)
  const pathname = url.pathname

  try {
    // ── Health ──────────────────────────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/health') {
      return send(res, 200, { status: 'ok', time: Date.now() })
    }

    // ── Legacy docs (JSON) ──────────────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/docs') {
      const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
      const docs = files.map(f => {
        try {
          const d = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'))
          const stat = fs.statSync(path.join(DATA_DIR, f))
          return { docId: d.docId, title: d.meta?.title || 'Untitled', updatedAt: d.updatedAt, size: stat.size }
        } catch { return null }
      }).filter(Boolean)
      return send(res, 200, { docs })
    }

    if (req.method === 'GET' && pathname.startsWith('/api/sync/')) {
      const docId = decodeURIComponent(pathname.replace('/api/sync/', ''))
      const safeId = docId.replace(/[^a-zA-Z0-9-_]/g, '_')
      const file = path.join(DATA_DIR, `${safeId}.json`)
      if (!fs.existsSync(file)) return send(res, 404, { error: 'Document not found' })
      return send(res, 200, JSON.parse(fs.readFileSync(file, 'utf8')))
    }

    if (req.method === 'POST' && pathname === '/api/sync') {
      const body = await readBody(req)
      const docId = body.docId || 'default'
      const safeId = docId.replace(/[^a-zA-Z0-9-_]/g, '_')
      const file = path.join(DATA_DIR, `${safeId}.json`)
      const record = { docId, content: body.content, meta: body.meta || {}, updatedAt: new Date().toISOString() }
      fs.writeFileSync(file, JSON.stringify(record, null, 2))
      return send(res, 200, { ok: true, docId, updatedAt: record.updatedAt })
    }

    // ── File API (/api/files) ───────────────────────────────────────────────

    // GET /api/files — list all .docx files
    if (req.method === 'GET' && pathname === '/api/files') {
      const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.docx'))
      const list = files.map(f => {
        const stat = fs.statSync(path.join(DOCS_DIR, f))
        const id = f.replace(/\.docx$/i, '')
        // Read display name from companion .meta.json if exists
        let name = id
        const metaPath = path.join(DOCS_DIR, `${id}.meta.json`)
        if (fs.existsSync(metaPath)) {
          try { name = JSON.parse(fs.readFileSync(metaPath, 'utf8')).name || id } catch { /* ignore */ }
        }
        return { id, name, size: stat.size, updatedAt: stat.mtime.toISOString() }
      })
      list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      return send(res, 200, list)
    }

    // GET /api/files/:id — download .docx
    if (req.method === 'GET' && pathname.startsWith('/api/files/')) {
      const parts = pathname.split('/')
      if (parts.length === 4) {
        const id = decodeURIComponent(parts[3])
        const file = path.join(DOCS_DIR, `${id}.docx`)
        if (!fs.existsSync(file)) return send(res, 404, { error: 'File not found' })
        return sendFile(res, file, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      }
    }

    // POST /api/files — upload/save .docx (multipart/form-data or raw binary)
    if (req.method === 'POST' && pathname === '/api/files') {
      const contentType = req.headers['content-type'] || ''
      let fileData, fileName

      if (contentType.includes('multipart/form-data')) {
        const boundaryMatch = contentType.match(/boundary=([^\s;]+)/)
        if (!boundaryMatch) return send(res, 400, { error: 'Missing boundary' })
        const boundary = boundaryMatch[1]
        const rawBody = await readBodyBuffer(req)
        // Prepend \r\n to body so first part is found correctly
        const fullBody = Buffer.concat([Buffer.from('\r\n'), rawBody])
        const { fields, files } = parseMultipart(fullBody, boundary)
        fileData = files['file']?.data
        fileName = fields['name'] || files['file']?.filename || 'document'
      } else {
        // Raw binary body with X-File-Name header
        fileData = await readBodyBuffer(req)
        fileName = req.headers['x-file-name'] ? decodeURIComponent(req.headers['x-file-name']) : 'document'
      }

      if (!fileData || fileData.length === 0) return send(res, 400, { error: 'No file data' })

      const base = nameToSlug(fileName)
      const id = uniqueDocId(base)
      const filePath = path.join(DOCS_DIR, `${id}.docx`)
      const metaPath = path.join(DOCS_DIR, `${id}.meta.json`)
      fs.writeFileSync(filePath, fileData)
      fs.writeFileSync(metaPath, JSON.stringify({ name: fileName.replace(/\.docx$/i, ''), updatedAt: new Date().toISOString() }))
      const stat = fs.statSync(filePath)
      return send(res, 201, { id, name: fileName.replace(/\.docx$/i, ''), size: stat.size, updatedAt: stat.mtime.toISOString() })
    }

    // PUT /api/files/:id/name — rename
    if (req.method === 'PUT' && pathname.match(/^\/api\/files\/[^/]+\/name$/)) {
      const id = decodeURIComponent(pathname.split('/')[3])
      const filePath = path.join(DOCS_DIR, `${id}.docx`)
      if (!fs.existsSync(filePath)) return send(res, 404, { error: 'File not found' })
      const body = await readBody(req)
      if (!body.name) return send(res, 400, { error: 'Missing name' })
      const metaPath = path.join(DOCS_DIR, `${id}.meta.json`)
      fs.writeFileSync(metaPath, JSON.stringify({ name: body.name, updatedAt: new Date().toISOString() }))
      return send(res, 200, { id, name: body.name })
    }

    // DELETE /api/files/:id — delete
    if (req.method === 'DELETE' && pathname.startsWith('/api/files/')) {
      const parts = pathname.split('/')
      if (parts.length === 4) {
        const id = decodeURIComponent(parts[3])
        const filePath = path.join(DOCS_DIR, `${id}.docx`)
        if (!fs.existsSync(filePath)) return send(res, 404, { error: 'File not found' })
        fs.unlinkSync(filePath)
        const metaPath = path.join(DOCS_DIR, `${id}.meta.json`)
        if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath)
        return send(res, 200, { ok: true })
      }
    }

    // ── Sessions API (/api/sessions) ────────────────────────────────────────

    // GET /api/sessions — list all sessions
    if (req.method === 'GET' && pathname === '/api/sessions') {
      const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'))
      const sessions = files.map(f => {
        try {
          const s = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8'))
          return {
            id: s.id,
            title: s.title || 'Untitled',
            model: s.model || '',
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            messageCount: Array.isArray(s.messages) ? s.messages.length : 0,
          }
        } catch { return null }
      }).filter(Boolean)
      sessions.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
      return send(res, 200, sessions)
    }

    // GET /api/sessions/:id — get session detail
    if (req.method === 'GET' && pathname.startsWith('/api/sessions/')) {
      const parts = pathname.split('/')
      if (parts.length === 4) {
        const id = decodeURIComponent(parts[3])
        const file = path.join(SESSIONS_DIR, `${id}.json`)
        if (!fs.existsSync(file)) return send(res, 404, { error: 'Session not found' })
        return send(res, 200, JSON.parse(fs.readFileSync(file, 'utf8')))
      }
    }

    // POST /api/sessions — create session
    if (req.method === 'POST' && pathname === '/api/sessions') {
      const body = await readBody(req)
      const id = newSessionId()
      const now = new Date().toISOString()
      const session = {
        id,
        title: body.title || 'New Session',
        model: body.model || '',
        messages: body.messages || [],
        createdAt: now,
        updatedAt: now,
      }
      fs.writeFileSync(path.join(SESSIONS_DIR, `${id}.json`), JSON.stringify(session, null, 2))
      return send(res, 201, session)
    }

    // PUT /api/sessions/:id — update session
    if (req.method === 'PUT' && pathname.startsWith('/api/sessions/')) {
      const parts = pathname.split('/')
      if (parts.length === 4) {
        const id = decodeURIComponent(parts[3])
        const file = path.join(SESSIONS_DIR, `${id}.json`)
        if (!fs.existsSync(file)) return send(res, 404, { error: 'Session not found' })
        const existing = JSON.parse(fs.readFileSync(file, 'utf8'))
        const body = await readBody(req)
        const updated = {
          ...existing,
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.messages !== undefined ? { messages: body.messages } : {}),
          updatedAt: new Date().toISOString(),
        }
        fs.writeFileSync(file, JSON.stringify(updated, null, 2))
        return send(res, 200, updated)
      }
    }

    // DELETE /api/sessions/:id — delete session
    if (req.method === 'DELETE' && pathname.startsWith('/api/sessions/')) {
      const parts = pathname.split('/')
      if (parts.length === 4) {
        const id = decodeURIComponent(parts[3])
        const file = path.join(SESSIONS_DIR, `${id}.json`)
        if (!fs.existsSync(file)) return send(res, 404, { error: 'Session not found' })
        fs.unlinkSync(file)
        return send(res, 200, { ok: true })
      }
    }

    send(res, 404, { error: 'Not found' })
  } catch (e) {
    send(res, 500, { error: e.message })
  }
})

server.listen(PORT, () => {
  console.log(`[sync-server] running on http://localhost:${PORT}`)
  console.log(`[sync-server] data dir: ${DATA_DIR}`)
  console.log(`[sync-server] docs dir: ${DOCS_DIR}`)
  console.log(`[sync-server] sessions dir: ${SESSIONS_DIR}`)
})
