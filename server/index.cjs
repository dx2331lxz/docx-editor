const express = require('express')
const path = require('path')
const app = express()

app.use(require('cors')())
app.use(express.json({ limit: '50mb' }))

app.use('/api/docs', require('./routes/docs.cjs'))
app.use('/api/config', require('./routes/config.cjs'))
app.use('/api/ai', require('./routes/ai.cjs'))
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: Date.now() }))

const DIST = path.join(__dirname, '../dist')
if (require('fs').existsSync(DIST)) {
  app.use(express.static(DIST))
  app.get('*', (req, res) => res.sendFile(path.join(DIST, 'index.html')))
}

const PORT = process.env.PORT || 3011
app.listen(PORT, () => console.log(`docx-editor server running on :${PORT}`))
