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
 * Cloud Sync — Quark:
 *   GET    /api/cloud/quark/config   → get current config (cookie preview)
 *   POST   /api/cloud/quark/config   → save cookie + folder
 *   POST   /api/cloud/quark/test     → test cookie validity
 *   GET    /api/cloud/quark/folders  → list root folders
 *   POST   /api/cloud/quark/sync     → sync a docx file to Quark
 *
 * Port: 3011
 */

const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const ROUTES = require('./api-routes.json')

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3011
const DATA_DIR = path.join(__dirname, 'data')
const DOCS_DIR = path.join(__dirname, 'docs')
const SESSIONS_DIR = path.join(__dirname, 'sessions')
const CONFIG_DIR = path.join(__dirname, 'config')
const CONFIG_FILE = path.join(CONFIG_DIR, 'ai.json')

// Ensure directories exist
for (const dir of [DATA_DIR, DOCS_DIR, SESSIONS_DIR, CONFIG_DIR]) {
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

// ── Quark Cloud Drive helpers ─────────────────────────────────────────────────

const QUARK_CONFIG_FILE = path.join(CONFIG_DIR, 'quark.json')

function readQuarkConfig() {
  if (!fs.existsSync(QUARK_CONFIG_FILE)) return { cookie: '', folderId: '0', folderName: '根目录' }
  try { return JSON.parse(fs.readFileSync(QUARK_CONFIG_FILE, 'utf8')) } catch { return { cookie: '', folderId: '0', folderName: '根目录' } }
}

function writeQuarkConfig(cfg) {
  fs.writeFileSync(QUARK_CONFIG_FILE, JSON.stringify(cfg, null, 2))
}

const QUARK_BASE_PARAMS = 'pr=ucpro&fr=pc&uc_param_str='

function quarkHeaders(cookie) {
  return {
    'Cookie': cookie,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'Origin': 'https://pan.quark.cn',
    'Referer': 'https://pan.quark.cn/',
  }
}

function quarkRequest(method, urlStr, cookie, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr)
    const bodyStr = body ? JSON.stringify(body) : null
    const headers = {
      ...quarkHeaders(cookie),
      ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
    }
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers,
    }
    const req = https.request(options, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())) }
        catch { resolve({}) }
      })
    })
    req.on('error', reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

async function testQuarkCookie(cookie) {
  try {
    const data = await quarkRequest(
      'GET',
      `https://drive-pc.quark.cn/1/clouddrive/file/sort?${QUARK_BASE_PARAMS}&pdir_fid=0&_page=1&_size=1`,
      cookie
    )
    return data.code === 0
  } catch { return false }
}

async function getQuarkFolders(cookie, folderId = '0') {
  try {
    const data = await quarkRequest(
      'GET',
      `https://drive-pc.quark.cn/1/clouddrive/file/sort?${QUARK_BASE_PARAMS}&pdir_fid=${folderId}&_page=1&_size=100&_sort=file_type:asc,file_name:asc`,
      cookie
    )
    if (data.code !== 0 || !Array.isArray(data.data?.list)) return []
    return data.data.list
      .filter(f => f.file_type === 'folder' || f.dir)
      .map(f => ({ fid: f.fid, name: f.file_name || f.name }))
  } catch { return [] }
}

/** Upload a local file to Quark Drive using multipart OSS upload */
async function uploadToQuark(cookie, filePath, fileName, folderId) {
  const fileBuffer = fs.readFileSync(filePath)
  const fileSize = fileBuffer.length
  const stat = fs.statSync(filePath)
  const lCreatedAt = Math.floor(stat.birthtimeMs || stat.mtimeMs)
  const lUpdatedAt = Math.floor(stat.mtimeMs)

  // ── Step 1: Pre-upload ──────────────────────────────────────────────────
  const preData = await quarkRequest(
    'POST',
    `https://drive-pc.quark.cn/1/clouddrive/file/upload/pre?${QUARK_BASE_PARAMS}`,
    cookie,
    {
      pdir_fid: folderId,
      file_name: fileName,
      format_type: 'docx',
      size: fileSize,
      l_created_at: lCreatedAt,
      l_updated_at: lUpdatedAt,
      ccp_hash_update: true,
      parallel_upload: true,
      dir_name: '',
    }
  )
  if (preData.code !== 0) {
    return { success: false, message: `预上传失败: ${preData.message || preData.code}` }
  }
  const { task_id, upload_id, obj_key, bucket, callback } = preData.data
  const region = preData.data.fstore_loc || preData.data.region || 'cn-hangzhou'
  const partSize = preData.data.metadata?.part_size || (4 * 1024 * 1024)

  // ── Step 2: Hash check (秒传) ───────────────────────────────────────────
  const md5 = crypto.createHash('md5').update(fileBuffer).digest('hex')
  const sha1 = crypto.createHash('sha1').update(fileBuffer).digest('hex')
  const hashData = await quarkRequest(
    'POST',
    `https://drive-pc.quark.cn/1/clouddrive/file/update/hash?${QUARK_BASE_PARAMS}`,
    cookie,
    { task_id, md5, sha1 }
  )
  if (hashData.code === 0 && hashData.data?.finish) {
    return { success: true, quarkFileId: hashData.data.fid || '', message: '秒传成功' }
  }

  // ── Step 3: Split into parts and upload to OSS ──────────────────────────
  const parts = []
  for (let i = 0; i * partSize < fileSize; i++) {
    parts.push(fileBuffer.slice(i * partSize, (i + 1) * partSize))
  }

  const ossHost = `${bucket}.oss-${region}.aliyuncs.com`
  const ossBase = `https://${ossHost}/${obj_key}`

  const etags = []
  for (let i = 0; i < parts.length; i++) {
    const partNum = i + 1
    const partBuf = parts[i]
    const ossDate = new Date().toUTCString()
    const contentMd5 = crypto.createHash('md5').update(partBuf).digest('base64')
    const contentType = 'application/octet-stream'

    // Build OSS signing string
    const canonicalHeaders = `x-oss-date:${ossDate}\nx-oss-user-agent:aliyun-sdk-js/6.16.0`
    const canonicalResource = `/${obj_key}?partNumber=${partNum}&uploadId=${upload_id}`
    const stringToSign = `PUT\n${contentMd5}\n${contentType}\n\n${canonicalHeaders}\n/${bucket}${canonicalResource}`

    // Get auth from Quark
    const authData = await quarkRequest(
      'POST',
      `https://drive-pc.quark.cn/1/clouddrive/file/upload/auth?${QUARK_BASE_PARAMS}`,
      cookie,
      { task_id, auth_meta: stringToSign }
    )
    if (authData.code !== 0) {
      return { success: false, message: `获取OSS授权失败: ${authData.message || authData.code}` }
    }
    const authKey = authData.data.auth_key

    // Upload part to OSS
    const etag = await new Promise((resolve, reject) => {
      const url = new URL(`${ossBase}?partNumber=${partNum}&uploadId=${upload_id}`)
      const ossReq = https.request({
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'Content-MD5': contentMd5,
          'Content-Length': partBuf.length,
          'x-oss-date': ossDate,
          'x-oss-user-agent': 'aliyun-sdk-js/6.16.0',
          'Authorization': authKey,
        },
      }, (res) => {
        const chunks = []
        res.on('data', c => chunks.push(c))
        res.on('end', () => resolve(res.headers.etag || ''))
      })
      ossReq.on('error', reject)
      ossReq.write(partBuf)
      ossReq.end()
    })
    etags.push(etag)
  }

  // ── Step 4: Complete multipart upload ───────────────────────────────────
  const partsXml = etags.map((e, i) =>
    `<Part><PartNumber>${i + 1}</PartNumber><ETag>${e}</ETag></Part>`
  ).join('')
  const completeXml = `<?xml version="1.0" encoding="UTF-8"?><CompleteMultipartUpload>${partsXml}</CompleteMultipartUpload>`

  await new Promise((resolve, reject) => {
    const url = new URL(`${ossBase}?uploadId=${upload_id}`)
    const xmlBuf = Buffer.from(completeXml)
    const ossReq = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Content-Length': xmlBuf.length,
      },
    }, (res) => {
      res.resume()
      res.on('end', resolve)
    })
    ossReq.on('error', reject)
    ossReq.write(xmlBuf)
    ossReq.end()
  })

  // ── Step 5: Notify Quark upload complete ────────────────────────────────
  const finishData = await quarkRequest(
    'POST',
    `https://drive-pc.quark.cn/1/clouddrive/file/upload/finish?${QUARK_BASE_PARAMS}`,
    cookie,
    { task_id, obj_key }
  )
  if (finishData.code === 0 && finishData.data?.finish) {
    return { success: true, quarkFileId: finishData.data.fid || '', message: '上传成功' }
  }
  return { success: false, message: `上传完成通知失败: ${finishData.message || finishData.code}` }
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
    if (req.method === 'GET' && pathname === ROUTES.health) {
      return send(res, 200, { status: 'ok', time: Date.now() })
    }

    // ── Config API (/api/config) ────────────────────────────────────────────
    const DEFAULT_CONFIG = { endpoint: 'https://api.siliconflow.cn/v1/chat/completions', apiKey: '', model: 'Pro/moonshotai/Kimi-K2.5' }

    if (req.method === 'GET' && pathname === ROUTES.config) {
      try {
        const cfg = fs.existsSync(CONFIG_FILE) ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) : DEFAULT_CONFIG
        return send(res, 200, { ...DEFAULT_CONFIG, ...cfg })
      } catch { return send(res, 200, DEFAULT_CONFIG) }
    }

    if (req.method === 'POST' && pathname === ROUTES.config) {
      const body = await readBody(req)
      const current = fs.existsSync(CONFIG_FILE) ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) : DEFAULT_CONFIG
      const updated = { ...current, ...body }
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2))
      return send(res, 200, { ok: true })
    }

    // ── AI Chat Proxy (/api/ai/chat) ────────────────────────────────────────
    if (req.method === 'POST' && pathname === ROUTES.aiChat) {
      const body = await readBodyBuffer(req)
      const cfg = fs.existsSync(CONFIG_FILE) ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) : DEFAULT_CONFIG
      const endpoint = cfg.endpoint || DEFAULT_CONFIG.endpoint
      const apiKey = cfg.apiKey || ''

      // Parse target URL
      const targetUrl = new URL(endpoint)
      const isHttps = targetUrl.protocol === 'https:'
      const lib = isHttps ? require('https') : require('http')

      const options = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        path: targetUrl.pathname + (targetUrl.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
      }

      const proxyReq = lib.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, {
          'Content-Type': proxyRes.headers['content-type'] || 'application/json',
          'Access-Control-Allow-Origin': '*',
        })
        proxyRes.pipe(res)
      })
      proxyReq.on('error', (e) => send(res, 502, { error: e.message }))
      proxyReq.write(body)
      proxyReq.end()
      return
    }

    // ── Legacy docs (JSON) ──────────────────────────────────────────────────
    if (req.method === 'GET' && pathname === ROUTES.docsLegacy) {
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

    if (req.method === 'GET' && pathname.startsWith(ROUTES.syncLegacy + '/')) {
      const docId = decodeURIComponent(pathname.replace('/api/sync/', ''))
      const safeId = docId.replace(/[^a-zA-Z0-9-_]/g, '_')
      const file = path.join(DATA_DIR, `${safeId}.json`)
      if (!fs.existsSync(file)) return send(res, 404, { error: 'Document not found' })
      return send(res, 200, JSON.parse(fs.readFileSync(file, 'utf8')))
    }

    if (req.method === 'POST' && pathname === ROUTES.syncLegacy) {
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
    if (req.method === 'GET' && pathname === ROUTES.files) {
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
    if (req.method === 'GET' && pathname.startsWith(ROUTES.files + '/')) {
      const parts = pathname.split('/')
      if (parts.length === 4) {
        const id = decodeURIComponent(parts[3])
        const file = path.join(DOCS_DIR, `${id}.docx`)
        if (!fs.existsSync(file)) return send(res, 404, { error: 'File not found' })
        return sendFile(res, file, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      }
    }

    // POST /api/files — upload/save .docx (multipart/form-data or raw binary)
    if (req.method === 'POST' && pathname === ROUTES.files) {
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
    if (req.method === 'DELETE' && pathname.startsWith(ROUTES.files + '/')) {
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
    if (req.method === 'GET' && pathname === ROUTES.sessions) {
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
    if (req.method === 'GET' && pathname.startsWith(ROUTES.sessions + '/')) {
      const parts = pathname.split('/')
      if (parts.length === 4) {
        const id = decodeURIComponent(parts[3])
        const file = path.join(SESSIONS_DIR, `${id}.json`)
        if (!fs.existsSync(file)) return send(res, 404, { error: 'Session not found' })
        return send(res, 200, JSON.parse(fs.readFileSync(file, 'utf8')))
      }
    }

    // POST /api/sessions — create session
    if (req.method === 'POST' && pathname === ROUTES.sessions) {
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
    if (req.method === 'PUT' && pathname.startsWith(ROUTES.sessions + '/')) {
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
    if (req.method === 'DELETE' && pathname.startsWith(ROUTES.sessions + '/')) {
      const parts = pathname.split('/')
      if (parts.length === 4) {
        const id = decodeURIComponent(parts[3])
        const file = path.join(SESSIONS_DIR, `${id}.json`)
        if (!fs.existsSync(file)) return send(res, 404, { error: 'Session not found' })
        fs.unlinkSync(file)
        return send(res, 200, { ok: true })
      }
    }

    // ── Quark Cloud Sync API ─────────────────────────────────────────────────

    // GET /api/cloud/quark/config — get current config (cookie preview)
    if (req.method === 'GET' && pathname === ROUTES.quarkConfig) {
      const cfg = readQuarkConfig()
      if (!cfg.cookie) return send(res, 200, { hasCookie: false })
      return send(res, 200, {
        hasCookie: true,
        cookiePreview: cfg.cookie.slice(0, 20) + '...',
        folderId: cfg.folderId || '0',
        folderName: cfg.folderName || '根目录',
      })
    }

    // POST /api/cloud/quark/config — save cookie + folder
    if (req.method === 'POST' && pathname === ROUTES.quarkConfig) {
      const body = await readBody(req)
      if (!body.cookie) return send(res, 400, { error: 'Missing cookie' })
      writeQuarkConfig({
        cookie: body.cookie,
        folderId: body.folderId || '0',
        folderName: body.folderName || '根目录',
      })
      return send(res, 200, { ok: true })
    }

    // POST /api/cloud/quark/test — test cookie validity
    if (req.method === 'POST' && pathname === ROUTES.quarkTest) {
      const body = await readBody(req)
      const cookie = body.cookie || readQuarkConfig().cookie
      if (!cookie) return send(res, 400, { error: 'No cookie provided' })
      const valid = await testQuarkCookie(cookie)
      return send(res, 200, { valid })
    }

    // GET /api/cloud/quark/folders — list root folders
    if (req.method === 'GET' && pathname === ROUTES.quarkFolders) {
      const cfg = readQuarkConfig()
      if (!cfg.cookie) return send(res, 400, { error: 'No cookie configured' })
      const folders = await getQuarkFolders(cfg.cookie, '0')
      return send(res, 200, { folders })
    }

    // POST /api/cloud/quark/sync — sync a docx file to Quark
    if (req.method === 'POST' && pathname === ROUTES.quarkSync) {
      const body = await readBody(req)
      if (!body.fileId) return send(res, 400, { error: 'Missing fileId' })
      const cfg = readQuarkConfig()
      if (!cfg.cookie) return send(res, 400, { error: 'No cookie configured' })
      const filePath = path.join(DOCS_DIR, `${body.fileId}.docx`)
      if (!fs.existsSync(filePath)) return send(res, 404, { error: 'File not found' })
      const metaPath = path.join(DOCS_DIR, `${body.fileId}.meta.json`)
      let fileName = body.fileId + '.docx'
      if (fs.existsSync(metaPath)) {
        try { fileName = JSON.parse(fs.readFileSync(metaPath, 'utf8')).name + '.docx' } catch {}
      }
      const result = await uploadToQuark(cfg.cookie, filePath, fileName, cfg.folderId || '0')
      return send(res, result.success ? 200 : 500, result)
    }

    // ── Static file serving (production) / Dev proxy (development) ────────
    const DIST_DIR = path.join(__dirname, '../dist')
    const VITE_PORT = process.env.VITE_PORT ? parseInt(process.env.VITE_PORT) : 5173

    if (fs.existsSync(DIST_DIR) && fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
      // Production: serve static files from dist/
      if (req.method === 'GET') {
        let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname)
        if (!filePath.startsWith(DIST_DIR)) return send(res, 403, { error: 'Forbidden' })
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase()
          const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css',
            '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon',
            '.woff':'font/woff', '.woff2':'font/woff2', '.json':'application/json', '.txt':'text/plain' }
          res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' })
          return fs.createReadStream(filePath).pipe(res)
        } else {
          // SPA fallback → index.html
          res.writeHead(200, { 'Content-Type': 'text/html' })
          return fs.createReadStream(path.join(DIST_DIR, 'index.html')).pipe(res)
        }
      }
    } else {
      // Development: reverse proxy to Vite dev server (supports HMR)
      const isWs = req.headers.upgrade === 'websocket'
      const proxyLib = require('http')
      const proxyReq = proxyLib.request(
        { hostname: 'localhost', port: VITE_PORT, path: req.url, method: req.method, headers: req.headers },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers)
          proxyRes.pipe(res)
        }
      )
      proxyReq.on('error', () => send(res, 502, { error: `Vite dev server not running on port ${VITE_PORT}` }))
      if (!isWs) req.pipe(proxyReq)
      return
    }

    send(res, 404, { error: 'Not found' })
  } catch (e) {
    send(res, 500, { error: e.message })
  }
})

// ── WebSocket proxy for Vite HMR (dev only) ────────────────────────────────
const net = require('net')
server.on('upgrade', (req, socket, head) => {
  const DIST_DIR = path.join(__dirname, '../dist')
  if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) return // production, no proxy
  const VITE_PORT = process.env.VITE_PORT ? parseInt(process.env.VITE_PORT) : 5173
  const target = net.createConnection({ host: 'localhost', port: VITE_PORT }, () => {
    target.write(`${req.method} ${req.url} HTTP/1.1\r\nHost: localhost:${VITE_PORT}\r\n` +
      Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n\r\n')
    target.write(head)
    socket.pipe(target).pipe(socket)
  })
  target.on('error', () => socket.destroy())
})

server.listen(PORT, () => {
  console.log(`[sync-server] running on http://localhost:${PORT}`)
  console.log(`[sync-server] data dir: ${DATA_DIR}`)
  console.log(`[sync-server] docs dir: ${DOCS_DIR}`)
  console.log(`[sync-server] sessions dir: ${SESSIONS_DIR}`)
})
