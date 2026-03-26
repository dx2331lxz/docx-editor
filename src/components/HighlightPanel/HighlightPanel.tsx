/**
 * HighlightPanel — 高亮工具增强
 * 20种颜色，最近使用，多色荧光笔模式，一键清除
 */
import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'

interface HighlightPanelProps {
  editor: Editor | null
  onClose: () => void
}

const HIGHLIGHT_COLORS = [
  '#ffff00', '#00ff00', '#00ffff', '#ff69b4', '#ff6600',
  '#ffd700', '#adff2f', '#40e0d0', '#da70d6', '#ff4500',
  '#ffa07a', '#98fb98', '#87ceeb', '#dda0dd', '#f0e68c',
  '#b0e0e6', '#ffb6c1', '#90ee90', '#ffcba4', '#e6e6fa',
]

const STORAGE_KEY = 'docx-editor-recent-highlights'

const HighlightPanel: React.FC<HighlightPanelProps> = ({ editor, onClose }) => {
  const [recent, setRecent] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [cycleMode, setCycleMode] = useState(false)
  const [cycleIdx, setCycleIdx] = useState(0)
  const [cycleColors, setCycleColors] = useState<string[]>(['#ffff00', '#00ff00', '#00ffff'])
  const [tab, setTab] = useState<'colors' | 'stats'>('colors')

  const applyHighlight = (color: string) => {
    if (!editor) return
    editor.chain().focus().setHighlight({ color }).run()
    const updated = [color, ...recent.filter(c => c !== color)].slice(0, 8)
    setRecent(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const clearHighlight = () => {
    editor?.chain().focus().unsetHighlight().run()
  }

  const applyNext = () => {
    if (!editor || cycleColors.length === 0) return
    const color = cycleColors[cycleIdx % cycleColors.length]
    applyHighlight(color)
    setCycleIdx(i => i + 1)
  }

  // Scan document for all highlights
  const getHighlightStats = () => {
    if (!editor) return []
    const stats: { color: string; count: number; texts: string[] }[] = []
    const map = new Map<string, { count: number; texts: string[] }>()
    editor.state.doc.descendants(node => {
      if (node.isText) {
        const mark = node.marks.find(m => m.type.name === 'highlight')
        if (mark) {
          const color = (mark.attrs.color as string) || '#ffff00'
          const existing = map.get(color) || { count: 0, texts: [] }
          existing.count++
          if (existing.texts.length < 5) existing.texts.push(node.text?.slice(0, 30) || '')
          map.set(color, existing)
        }
      }
    })
    map.forEach((v, color) => stats.push({ color, ...v }))
    return stats.sort((a, b) => b.count - a.count)
  }

  const stats = tab === 'stats' ? getHighlightStats() : []

  const toggleCycleColor = (color: string) => {
    setCycleColors(prev =>
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[420px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b">
          <h3 className="text-sm font-semibold">🖊 高亮工具</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {(['colors', 'stats'] as const).map(t => (
            <button key={t}
              className={`flex-1 py-1.5 text-xs border-b-2 ${tab === t ? 'border-blue-500 text-blue-600 bg-white' : 'border-transparent text-gray-500'}`}
              onClick={() => setTab(t)}>
              {t === 'colors' ? '🎨 颜色' : '📊 高亮统计'}
            </button>
          ))}
        </div>

        {tab === 'colors' && (
          <div className="p-4 space-y-4">
            {/* 20-color grid */}
            <div>
              <div className="text-xs text-gray-500 mb-2">20种荧光色</div>
              <div className="grid grid-cols-10 gap-1">
                {HIGHLIGHT_COLORS.map(color => (
                  <button key={color}
                    className="w-7 h-7 rounded border-2 border-white hover:border-gray-400 shadow-sm transition-transform hover:scale-110"
                    style={{ backgroundColor: color }}
                    onClick={() => applyHighlight(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Recent colors */}
            {recent.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-2">最近使用</div>
                <div className="flex gap-1 flex-wrap">
                  {recent.map(color => (
                    <button key={color}
                      className="w-7 h-7 rounded-full border-2 border-white shadow hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => applyHighlight(color)}
                      title={color} />
                  ))}
                </div>
              </div>
            )}

            {/* Multi-color cycle mode */}
            <div className="border rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-gray-700">🌈 多色荧光笔模式</div>
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={cycleMode} onChange={e => setCycleMode(e.target.checked)} />
                  启用
                </label>
              </div>
              <div className="text-xs text-gray-400 mb-2">点击选择要循环的颜色：</div>
              <div className="flex flex-wrap gap-1 mb-2">
                {HIGHLIGHT_COLORS.slice(0, 10).map(color => (
                  <button key={color}
                    className={`w-6 h-6 rounded border-2 transition-all ${cycleColors.includes(color) ? 'border-blue-500 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => toggleCycleColor(color)} />
                ))}
              </div>
              {cycleMode && (
                <button
                  className="w-full py-1.5 text-xs bg-gradient-to-r from-yellow-300 via-green-300 to-blue-300 text-gray-800 rounded font-medium hover:opacity-90"
                  onClick={applyNext}>
                  应用下一个颜色 → ({cycleColors[cycleIdx % (cycleColors.length || 1)] || '—'})
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                className="flex-1 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center gap-1"
                onClick={clearHighlight}>
                🚫 清除高亮
              </button>
              <button
                className="flex-1 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center gap-1"
                onClick={() => setRecent([])}>
                🗑 清除历史
              </button>
            </div>
          </div>
        )}

        {tab === 'stats' && (
          <div className="p-4">
            {stats.length === 0 ? (
              <div className="text-center text-gray-400 py-8 text-sm">文档中没有高亮内容</div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-gray-500 mb-3">共 {stats.reduce((a, b) => a + b.count, 0)} 处高亮</div>
                {stats.map(s => (
                  <div key={s.color} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className="w-6 h-6 rounded flex-shrink-0 border border-gray-200 mt-0.5"
                      style={{ backgroundColor: s.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-gray-500">{s.color}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{s.count} 处</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">
                        {s.texts.join(' · ').slice(0, 60)}…
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default HighlightPanel
