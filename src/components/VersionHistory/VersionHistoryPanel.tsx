import { useState, useEffect, useCallback } from 'react'
import { Editor } from '@tiptap/react'

interface Version {
  id: string
  name: string
  html: string
  timestamp: number
}

interface Props {
  editor: Editor | null
  onClose: () => void
}

const STORAGE_KEY = 'docx-editor-versions'
const MAX_VERSIONS = 20

function loadVersions(): Version[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveVersions(versions: Version[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(versions))
}

function simpleDiff(oldHtml: string, newHtml: string): string {
  const stripTags = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const oldWords = stripTags(oldHtml).split(' ')
  const newWords = stripTags(newHtml).split(' ')
  const result: string[] = []
  const maxLen = Math.max(oldWords.length, newWords.length)
  for (let i = 0; i < maxLen; i++) {
    const o = oldWords[i]
    const n = newWords[i]
    if (o === n) {
      if (n) result.push(n)
    } else if (!o) {
      result.push(`<ins style="background:#d4edda;color:#155724">${n}</ins>`)
    } else if (!n) {
      result.push(`<del style="background:#f8d7da;color:#721c24">${o}</del>`)
    } else {
      result.push(`<del style="background:#f8d7da;color:#721c24">${o}</del>`)
      result.push(`<ins style="background:#d4edda;color:#155724">${n}</ins>`)
    }
  }
  return result.join(' ')
}

export default function VersionHistoryPanel({ editor, onClose }: Props) {
  const [versions, setVersions] = useState<Version[]>(loadVersions)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [diffHtml, setDiffHtml] = useState<string>('')
  const [customName, setCustomName] = useState('')

  const saveVersion = useCallback((name?: string) => {
    if (!editor) return
    const html = editor.getHTML()
    const newVersion: Version = {
      id: Date.now().toString(),
      name: name || `版本 ${new Date().toLocaleString('zh-CN')}`,
      html,
      timestamp: Date.now(),
    }
    setVersions(prev => {
      const updated = [newVersion, ...prev].slice(0, MAX_VERSIONS)
      saveVersions(updated)
      return updated
    })
  }, [editor])

  // Ctrl+S listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        saveVersion()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [saveVersion])

  function selectVersion(v: Version) {
    setSelectedId(v.id)
    if (!editor) return
    const currentHtml = editor.getHTML()
    setDiffHtml(simpleDiff(v.html, currentHtml))
  }

  function restoreVersion(v: Version) {
    if (!editor) return
    if (!confirm(`恢复到"${v.name}"？当前内容将被替换。`)) return
    editor.commands.setContent(v.html)
    onClose()
  }

  function deleteVersion(id: string) {
    setVersions(prev => {
      const updated = prev.filter(v => v.id !== id)
      saveVersions(updated)
      return updated
    })
    if (selectedId === id) {
      setSelectedId(null)
      setDiffHtml('')
    }
  }

  const selected = versions.find(v => v.id === selectedId)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: '#fff', borderRadius: 8, width: 780, maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>版本历史</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        {/* Save controls */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 8 }}>
          <input
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            placeholder="版本名称（可选）"
            style={{ flex: 1, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}
          />
          <button
            onClick={() => { saveVersion(customName || undefined); setCustomName('') }}
            style={{ padding: '6px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
          >
            保存当前版本
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Version list */}
          <div style={{ width: 260, borderRight: '1px solid #e5e7eb', overflowY: 'auto', padding: '8px 0' }}>
            {versions.length === 0 && (
              <div style={{ padding: 20, color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>
                暂无版本记录<br />
                <small>Ctrl+S 自动保存快照</small>
              </div>
            )}
            {versions.map(v => (
              <div
                key={v.id}
                onClick={() => selectVersion(v)}
                style={{
                  padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                  background: selectedId === v.id ? '#eff6ff' : 'transparent',
                  borderLeft: selectedId === v.id ? '3px solid #2563eb' : '3px solid transparent',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1f2937', marginBottom: 2 }}>{v.name}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(v.timestamp).toLocaleString('zh-CN')}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button
                    onClick={e => { e.stopPropagation(); restoreVersion(v) }}
                    style={{ fontSize: 11, padding: '2px 8px', background: '#dcfce7', color: '#166534', border: 'none', borderRadius: 3, cursor: 'pointer' }}
                  >恢复</button>
                  <button
                    onClick={e => { e.stopPropagation(); deleteVersion(v.id) }}
                    style={{ fontSize: 11, padding: '2px 8px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 3, cursor: 'pointer' }}
                  >删除</button>
                </div>
              </div>
            ))}
          </div>

          {/* Diff panel */}
          <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
            {selected ? (
              <>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                  与当前文档对比 — <strong>{selected.name}</strong>
                  <span style={{ marginLeft: 16, fontSize: 11 }}>
                    <span style={{ background: '#d4edda', color: '#155724', padding: '1px 4px', borderRadius: 2, marginRight: 4 }}>绿色=新增</span>
                    <span style={{ background: '#f8d7da', color: '#721c24', padding: '1px 4px', borderRadius: 2 }}>红色=删除</span>
                  </span>
                </div>
                <div
                  style={{ fontSize: 14, lineHeight: 1.7, padding: 12, background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb', minHeight: 200 }}
                  dangerouslySetInnerHTML={{ __html: diffHtml || '（内容相同）' }}
                />
              </>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: 14, marginTop: 40, textAlign: 'center' }}>
                点击左侧版本查看差异对比
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
