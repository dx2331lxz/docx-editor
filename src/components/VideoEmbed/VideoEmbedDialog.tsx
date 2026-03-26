import { useState } from 'react'
import { Editor } from '@tiptap/react'

type VideoAlign = 'left' | 'center' | 'right'
type VideoSize = 'small' | 'medium' | 'large' | 'fullwidth'

interface Props {
  editor: Editor | null
  onClose: () => void
}

const SIZE_MAP: Record<VideoSize, { width: number; height: number; label: string }> = {
  small:     { width: 320,  height: 180,  label: '小 (320×180)' },
  medium:    { width: 560,  height: 315,  label: '中 (560×315)' },
  large:     { width: 720,  height: 405,  label: '大 (720×405)' },
  fullwidth: { width: 854,  height: 480,  label: '全宽 (854×480)' },
}

function parseVideoUrl(url: string): { embedUrl: string; platform: string } | null {
  url = url.trim()
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if (ytMatch) {
    return { embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`, platform: 'YouTube' }
  }
  // Bilibili
  const biliMatch = url.match(/bilibili\.com\/video\/(BV[\w]+|av\d+)/)
  if (biliMatch) {
    const id = biliMatch[1]
    if (id.startsWith('BV')) {
      return { embedUrl: `https://player.bilibili.com/player.html?bvid=${id}&autoplay=0`, platform: 'Bilibili' }
    } else {
      const avId = id.replace('av', '')
      return { embedUrl: `https://player.bilibili.com/player.html?aid=${avId}&autoplay=0`, platform: 'Bilibili' }
    }
  }
  // Generic iframe URL
  if (url.startsWith('http') && (url.includes('embed') || url.includes('iframe'))) {
    return { embedUrl: url, platform: '通用链接' }
  }
  return null
}

export default function VideoEmbedDialog({ editor, onClose }: Props) {
  const [url, setUrl] = useState('')
  const [size, setSize] = useState<VideoSize>('medium')
  const [align, setAlign] = useState<VideoAlign>('center')
  const [caption, setCaption] = useState('')
  const [error, setError] = useState('')
  const [parsed, setParsed] = useState<{ embedUrl: string; platform: string } | null>(null)

  function handleUrlChange(v: string) {
    setUrl(v)
    setError('')
    const result = parseVideoUrl(v)
    setParsed(result)
    if (v && !result) setError('无法识别视频链接，请输入 YouTube 或 Bilibili 视频地址')
  }

  function insert() {
    if (!editor || !parsed) return
    const { width, height } = SIZE_MAP[size]
    const alignStyle = align === 'center' ? 'margin:0 auto;display:block;' :
                       align === 'right'  ? 'margin-left:auto;display:block;' : 'display:block;'
    const html = `
<div style="width:${width}px;${alignStyle}margin-top:8px;margin-bottom:8px;">
  <div style="position:relative;padding-bottom:${Math.round(height/width*100)}%;height:0;overflow:hidden;border-radius:6px;box-shadow:0 2px 12px rgba(0,0,0,0.15);">
    <iframe
      src="${parsed.embedUrl}"
      style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;"
      allowfullscreen
      allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
    ></iframe>
  </div>
  ${caption ? `<p style="text-align:center;font-size:12px;color:#6b7280;margin-top:6px;">${caption}</p>` : ''}
</div>`
    editor.chain().focus().insertContent(html).run()
    onClose()
  }

  const { width, height } = SIZE_MAP[size]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 10, width: 500, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#1e293b' }}>嵌入在线视频</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          {/* URL input */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>视频链接</label>
            <input
              value={url}
              onChange={e => handleUrlChange(e.target.value)}
              placeholder="粘贴 YouTube 或 Bilibili 视频链接..."
              style={{ width: '100%', padding: '8px 12px', border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`, borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
            />
            {error && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{error}</div>}
            {parsed && <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4 }}>✓ 检测到 {parsed.platform} 视频</div>}
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
              支持：youtube.com/watch?v=... · youtu.be/... · bilibili.com/video/BV...
            </div>
          </div>

          {/* Preview */}
          {parsed && (
            <div style={{ marginBottom: 16, background: '#0f172a', borderRadius: 8, overflow: 'hidden', position: 'relative', paddingBottom: `${Math.round(height/width*100)}%`, height: 0 }}>
              <iframe
                src={parsed.embedUrl}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allowFullScreen
              />
            </div>
          )}
          {!parsed && url === '' && (
            <div style={{ background: '#f1f5f9', borderRadius: 8, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: '#94a3b8', fontSize: 13 }}>
              🎬 在上方输入视频链接
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Size */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>视频大小</label>
              <select value={size} onChange={e => setSize(e.target.value as VideoSize)}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }}>
                {Object.entries(SIZE_MAP).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            {/* Align */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>对齐方式</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['left', 'center', 'right'] as VideoAlign[]).map(a => (
                  <button key={a} onClick={() => setAlign(a)}
                    style={{ flex: 1, padding: '6px 4px', border: `1px solid ${align === a ? '#3b82f6' : '#e5e7eb'}`, borderRadius: 6, cursor: 'pointer', background: align === a ? '#eff6ff' : '#fff', fontSize: 11 }}>
                    {a === 'left' ? '⬅ 左' : a === 'center' ? '⬛ 中' : '➡ 右'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Caption */}
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>视频说明（可选）</label>
            <input value={caption} onChange={e => setCaption(e.target.value)}
              placeholder="输入视频说明文字..."
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '6px 18px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>取消</button>
          <button onClick={insert} disabled={!parsed}
            style={{ padding: '6px 20px', background: parsed ? '#2563eb' : '#9ca3af', color: '#fff', border: 'none', borderRadius: 6, cursor: parsed ? 'pointer' : 'not-allowed', fontSize: 13 }}>
            插入视频
          </button>
        </div>
      </div>
    </div>
  )
}
