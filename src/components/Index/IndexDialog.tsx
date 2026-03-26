/**
 * IndexDialog — 索引生成
 * 标记索引项，生成按字母排序的索引
 */
import React, { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/react'

interface IndexDialogProps {
  editor: Editor | null
  onClose: () => void
}

interface IndexEntry {
  id: string
  term: string
  subterm?: string
  count: number
}

const STORAGE_KEY = 'docx-editor-index-entries'

const IndexDialog: React.FC<IndexDialogProps> = ({ editor, onClose }) => {
  const [entries, setEntries] = useState<IndexEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [tab, setTab] = useState<'mark' | 'generate'>('mark')
  const [columns, setColumns] = useState(2)
  const [showTitle, setShowTitle] = useState(true)
  const [titleText, setTitleText] = useState('索引')
  const [newTerm, setNewTerm] = useState('')
  const [newSubterm, setNewSubterm] = useState('')
  const [selectedText, setSelectedText] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  }, [entries])

  useEffect(() => {
    if (editor) {
      const { from, to } = editor.state.selection
      const text = editor.state.doc.textBetween(from, to, ' ').trim()
      if (text) { setSelectedText(text); setNewTerm(text) }
    }
  }, [editor])

  const addEntry = () => {
    if (!newTerm.trim()) return
    const existing = entries.find(e => e.term === newTerm.trim() && e.subterm === (newSubterm.trim() || undefined))
    if (existing) {
      setEntries(prev => prev.map(e => e.id === existing.id ? { ...e, count: e.count + 1 } : e))
    } else {
      setEntries(prev => [...prev, {
        id: `idx-${Date.now()}`, term: newTerm.trim(),
        subterm: newSubterm.trim() || undefined, count: 1
      }])
    }
    // Mark in document
    if (editor && newTerm.trim()) {
      const term = newTerm.trim()
      const html = `<mark class="index-entry" data-idx-term="${term}" style="background:transparent;border-bottom:1px dotted #9ca3af;" title="索引项: ${term}">${term}</mark>`
      if (selectedText === term) {
        editor.chain().focus().insertContent(html).run()
      }
    }
    setNewTerm(selectedText || '')
    setNewSubterm('')
  }

  // Sort entries alphabetically
  const sorted = [...entries].sort((a, b) => {
    const cmp = a.term.localeCompare(b.term, 'zh-CN')
    if (cmp !== 0) return cmp
    return (a.subterm || '').localeCompare(b.subterm || '', 'zh-CN')
  })

  // Group by first character
  const grouped: Map<string, IndexEntry[]> = new Map()
  for (const e of sorted) {
    const key = e.term[0]?.toUpperCase() || '#'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(e)
  }

  const generateIndex = () => {
    if (!editor || entries.length === 0) return

    let html = `<div class="document-index" style="margin-top:24px;font-size:12px;">`
    if (showTitle) {
      html += `<div style="font-size:14px;font-weight:700;border-bottom:2px solid #374151;margin-bottom:12px;padding-bottom:4px;">${titleText}</div>`
    }

    const cols = Array.from(grouped.entries())
    const itemsPerCol = Math.ceil(cols.length / columns)

    html += `<div style="display:grid;grid-template-columns:repeat(${columns},1fr);gap:0 24px;">`

    for (let col = 0; col < columns; col++) {
      const slice = cols.slice(col * itemsPerCol, (col + 1) * itemsPerCol)
      html += `<div>`
      for (const [letter, items] of slice) {
        html += `<div style="font-weight:700;margin-top:8px;margin-bottom:4px;color:#374151;">${letter}</div>`
        for (const item of items) {
          if (item.subterm) {
            html += `<div style="margin-left:16px;margin-bottom:2px;">${item.term} → ${item.subterm} <span style="color:#6b7280;">${item.count}</span></div>`
          } else {
            html += `<div style="margin-bottom:2px;">${item.term} <span style="color:#6b7280;">${item.count}</span></div>`
          }
        }
      }
      html += `</div>`
    }

    html += `</div></div>`
    editor.chain().focus().insertContent(html).run()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[500px] flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-base font-semibold">索引</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {(['mark', 'generate'] as const).map(t => (
            <button
              key={t}
              className={`px-4 py-2 text-sm border-b-2 ${tab === t ? 'border-blue-500 text-blue-600 bg-white' : 'border-transparent text-gray-500'}`}
              onClick={() => setTab(t)}
            >
              {t === 'mark' ? `标记索引项 (${entries.length})` : '生成索引'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'mark' && (
            <div className="space-y-4">
              {selectedText && (
                <div className="p-2 bg-blue-50 rounded text-sm text-blue-700">
                  已选中文字：<strong>{selectedText}</strong>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">索引项（主词）*</label>
                  <input type="text" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    value={newTerm} onChange={e => setNewTerm(e.target.value)}
                    placeholder="输入索引词" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">子索引项（可选）</label>
                  <input type="text" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    value={newSubterm} onChange={e => setNewSubterm(e.target.value)}
                    placeholder="子项（可空）" />
                </div>
              </div>

              <button
                className="w-full py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                onClick={addEntry}
                disabled={!newTerm.trim()}
              >
                标记索引项
              </button>

              {/* Entries list */}
              {entries.length > 0 && (
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {entries.map(e => (
                    <div key={e.id} className="flex items-center justify-between px-3 py-1.5 text-sm hover:bg-gray-50">
                      <span className="text-gray-800">
                        {e.term}{e.subterm ? ` → ${e.subterm}` : ''}
                        <span className="text-xs text-gray-400 ml-2">×{e.count}</span>
                      </span>
                      <button
                        className="text-red-400 hover:text-red-600 text-xs"
                        onClick={() => setEntries(prev => prev.filter(x => x.id !== e.id))}
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'generate' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">列数</label>
                  <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    value={columns} onChange={e => setColumns(parseInt(e.target.value))}>
                    <option value={1}>1列</option>
                    <option value={2}>2列</option>
                    <option value={3}>3列</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">标题文字</label>
                  <input type="text" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    value={titleText} onChange={e => setTitleText(e.target.value)} />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={showTitle} onChange={e => setShowTitle(e.target.checked)} />
                显示索引标题
              </label>

              {/* Preview */}
              <div className="border rounded p-3 bg-gray-50 max-h-48 overflow-y-auto">
                {entries.length === 0 ? (
                  <div className="text-sm text-gray-400 text-center py-4">还没有标记索引项</div>
                ) : (
                  <div style={{ fontSize: 12 }}>
                    {showTitle && <div className="font-bold mb-2 border-b pb-1" style={{ fontSize: 13 }}>{titleText}</div>}
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '0 16px' }}>
                      {Array.from(grouped.entries()).map(([letter, items]) => (
                        <div key={letter}>
                          <div className="font-bold text-gray-700 mt-1">{letter}</div>
                          {items.map(item => (
                            <div key={item.id} className="text-gray-600" style={{ marginLeft: item.subterm ? 12 : 0 }}>
                              {item.subterm ? `${item.term} → ${item.subterm}` : item.term}
                              <span className="text-gray-400 ml-1">{item.count}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                className="w-full py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                onClick={generateIndex}
                disabled={entries.length === 0}
              >
                插入索引到文档
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default IndexDialog
