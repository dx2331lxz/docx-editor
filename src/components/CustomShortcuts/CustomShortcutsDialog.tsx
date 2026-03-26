import { useState, useEffect, useRef } from 'react'

interface ShortcutEntry {
  id: string
  category: string
  action: string
  defaultKey: string
  currentKey: string
}

interface Props {
  onClose: () => void
}

const STORAGE_KEY = 'docx-editor-custom-shortcuts'

const DEFAULT_SHORTCUTS: Omit<ShortcutEntry, 'currentKey'>[] = [
  { id: 'bold',          category: '格式', action: '粗体',         defaultKey: 'Ctrl+B' },
  { id: 'italic',        category: '格式', action: '斜体',         defaultKey: 'Ctrl+I' },
  { id: 'underline',     category: '格式', action: '下划线',       defaultKey: 'Ctrl+U' },
  { id: 'strike',        category: '格式', action: '删除线',       defaultKey: 'Ctrl+Shift+S' },
  { id: 'align-left',    category: '对齐', action: '左对齐',       defaultKey: 'Ctrl+L' },
  { id: 'align-center',  category: '对齐', action: '居中',         defaultKey: 'Ctrl+E' },
  { id: 'align-right',   category: '对齐', action: '右对齐',       defaultKey: 'Ctrl+R' },
  { id: 'align-justify', category: '对齐', action: '两端对齐',     defaultKey: 'Ctrl+J' },
  { id: 'undo',          category: '编辑', action: '撤销',         defaultKey: 'Ctrl+Z' },
  { id: 'redo',          category: '编辑', action: '重做',         defaultKey: 'Ctrl+Y' },
  { id: 'select-all',    category: '编辑', action: '全选',         defaultKey: 'Ctrl+A' },
  { id: 'find',          category: '导航', action: '查找',         defaultKey: 'Ctrl+F' },
  { id: 'replace',       category: '导航', action: '查找替换',     defaultKey: 'Ctrl+H' },
  { id: 'adv-find',      category: '导航', action: '高级查找',     defaultKey: 'Ctrl+Shift+F' },
  { id: 'save',          category: '文件', action: '保存',         defaultKey: 'Ctrl+S' },
  { id: 'print',         category: '文件', action: '打印',         defaultKey: 'Ctrl+P' },
  { id: 'new',           category: '文件', action: '新建',         defaultKey: 'Ctrl+N' },
]

function loadCustomKeys(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

function saveCustomKeys(keys: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
}

function keyEventToString(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  const key = e.key
  if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
    parts.push(key.length === 1 ? key.toUpperCase() : key)
  }
  return parts.join('+')
}

export default function CustomShortcutsDialog({ onClose }: Props) {
  const [customKeys, setCustomKeys] = useState<Record<string, string>>(loadCustomKeys)
  const [recording, setRecording] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [savedMsg, setSavedMsg] = useState(false)

  const entries: ShortcutEntry[] = DEFAULT_SHORTCUTS.map(s => ({
    ...s,
    currentKey: customKeys[s.id] || s.defaultKey,
  }))

  useEffect(() => {
    if (!recording) return
    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      if (e.key === 'Escape') { setRecording(null); return }
      const combo = keyEventToString(e)
      if (combo && combo !== 'Ctrl' && combo !== 'Alt' && combo !== 'Shift') {
        setCustomKeys(prev => ({ ...prev, [recording]: combo }))
        setRecording(null)
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [recording])

  function resetOne(id: string) {
    setCustomKeys(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function resetAll() {
    setCustomKeys({})
  }

  function save() {
    saveCustomKeys(customKeys)
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2000)
  }

  const categories = Array.from(new Set(entries.map(e => e.category)))
  const filtered = filter
    ? entries.filter(e => e.action.includes(filter) || e.currentKey.toLowerCase().includes(filter.toLowerCase()))
    : entries

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 10, width: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#1e293b' }}>⌨️ 自定义快捷键</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        <div style={{ padding: '10px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 8 }}>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="搜索操作..."
            style={{ flex: 1, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
          <button onClick={resetAll}
            style={{ padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#ef4444', background: '#fff' }}>
            重置全部
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {recording && (
            <div style={{ margin: '8px 16px', padding: '10px 16px', background: '#eff6ff', border: '2px solid #3b82f6', borderRadius: 8, fontSize: 13, color: '#1e40af', textAlign: 'center' }}>
              🎹 请按下新的快捷键组合…（按 Esc 取消）
            </div>
          )}

          {(filter ? [null] : categories).map(cat => {
            const group = cat === null ? filtered : filtered.filter(e => e.category === cat)
            if (group.length === 0) return null
            return (
              <div key={cat || 'all'}>
                {cat && (
                  <div style={{ padding: '6px 20px 2px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cat}</div>
                )}
                {group.map(entry => {
                  const isCustom = !!customKeys[entry.id]
                  const isRecording = recording === entry.id
                  return (
                    <div key={entry.id} style={{
                      display: 'flex', alignItems: 'center', padding: '8px 20px', gap: 10,
                      background: isRecording ? '#eff6ff' : 'transparent',
                      borderLeft: isRecording ? '3px solid #3b82f6' : '3px solid transparent',
                    }}>
                      <span style={{ flex: 1, fontSize: 13, color: '#1f2937' }}>{entry.action}</span>
                      <kbd style={{
                        padding: '3px 10px', background: isCustom ? '#eff6ff' : '#f3f4f6',
                        border: `1px solid ${isCustom ? '#3b82f6' : '#e5e7eb'}`,
                        borderRadius: 5, fontSize: 12, fontFamily: 'monospace',
                        color: isCustom ? '#1e40af' : '#374151', minWidth: 80, textAlign: 'center'
                      }}>
                        {entry.currentKey}
                      </kbd>
                      <button onClick={() => setRecording(entry.id)}
                        style={{ padding: '3px 10px', border: '1px solid #d1d5db', borderRadius: 5, cursor: 'pointer', fontSize: 11, background: '#fff', color: '#374151' }}>
                        录制
                      </button>
                      {isCustom && (
                        <button onClick={() => resetOne(entry.id)}
                          style={{ padding: '3px 8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, color: '#9ca3af' }}>
                          ↩
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: savedMsg ? '#16a34a' : '#9ca3af' }}>
            {savedMsg ? '✓ 已保存' : `已自定义 ${Object.keys(customKeys).length} 个快捷键`}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '6px 16px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>取消</button>
            <button onClick={save} style={{ padding: '6px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>保存</button>
          </div>
        </div>
      </div>
    </div>
  )
}
