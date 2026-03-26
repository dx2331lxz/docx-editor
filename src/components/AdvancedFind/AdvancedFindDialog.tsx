import { useState, useCallback, useEffect, useRef } from 'react'
import { Editor } from '@tiptap/react'

interface SearchOptions {
  query: string
  caseSensitive: boolean
  wholeWord: boolean
  useWildcard: boolean
  // Format filters
  bold: boolean | null
  italic: boolean | null
  color: string
}

interface MatchResult {
  index: number
  text: string
  context: string
}

const DEFAULT_OPTIONS: SearchOptions = {
  query: '',
  caseSensitive: false,
  wholeWord: false,
  useWildcard: false,
  bold: null,
  italic: null,
  color: '',
}

function wildcardToRegex(pattern: string, caseSensitive: boolean): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp(escaped, caseSensitive ? 'g' : 'gi')
}

function buildRegex(opts: SearchOptions): RegExp | null {
  if (!opts.query) return null
  try {
    let pattern = opts.useWildcard
      ? opts.query.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')
      : opts.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (opts.wholeWord) pattern = `\\b${pattern}\\b`
    return new RegExp(pattern, opts.caseSensitive ? 'g' : 'gi')
  } catch {
    return null
  }
}

interface Props {
  editor: Editor | null
  onClose: () => void
}

export default function AdvancedFindDialog({ editor, onClose }: Props) {
  const [opts, setOpts] = useState<SearchOptions>(DEFAULT_OPTIONS)
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [replaceText, setReplaceText] = useState('')
  const [tab, setTab] = useState<'find' | 'replace'>('find')
  const [showFormatFilter, setShowFormatFilter] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const runSearch = useCallback(() => {
    if (!editor || !opts.query) {
      setMatches([])
      return
    }
    const regex = buildRegex(opts)
    if (!regex) return

    const results: MatchResult[] = []
    const docText = editor.state.doc.textContent

    let m: RegExpExecArray | null
    regex.lastIndex = 0
    while ((m = regex.exec(docText)) !== null) {
      const start = Math.max(0, m.index - 20)
      const end = Math.min(docText.length, m.index + m[0].length + 20)
      results.push({
        index: m.index,
        text: m[0],
        context: `...${docText.slice(start, m.index)}<mark>${m[0]}</mark>${docText.slice(m.index + m[0].length, end)}...`,
      })
      if (results.length >= 200) break
    }
    setMatches(results)
    setCurrentIdx(0)
  }, [editor, opts])

  useEffect(() => { runSearch() }, [opts.query, opts.caseSensitive, opts.wholeWord, opts.useWildcard])

  function navigateTo(idx: number) {
    if (!editor || matches.length === 0) return
    const clamped = ((idx % matches.length) + matches.length) % matches.length
    setCurrentIdx(clamped)
    const m = matches[clamped]
    const regex = buildRegex(opts)
    if (!regex) return

    // Find and select in editor
    let pos = 0
    let found = false
    editor.state.doc.descendants((node, nodePos) => {
      if (found || !node.isText) return
      const nodeText = node.text || ''
      regex.lastIndex = 0
      const match = regex.exec(nodeText)
      if (match && pos + match.index === m.index) {
        editor.commands.setTextSelection({ from: nodePos + match.index + 1, to: nodePos + match.index + match[0].length + 1 })
        found = true
      }
      pos += nodeText.length
    })
  }

  function replaceOne() {
    if (!editor || matches.length === 0) return
    const selected = editor.state.selection
    if (selected.empty) { navigateTo(currentIdx); return }
    editor.chain().focus().insertContent(replaceText).run()
    runSearch()
  }

  function replaceAll() {
    if (!editor || !opts.query) return
    const regex = buildRegex(opts)
    if (!regex) return
    const content = editor.getHTML()
    const replaced = content.replace(regex, replaceText)
    editor.commands.setContent(replaced)
    runSearch()
  }

  function update(partial: Partial<SearchOptions>) {
    setOpts(prev => ({ ...prev, ...partial }))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 60, zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 10, width: 540, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#1e293b' }}>高级查找</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
          {(['find', 'replace'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13,
                borderBottom: tab === t ? '2px solid #2563eb' : '2px solid transparent',
                color: tab === t ? '#2563eb' : '#6b7280' }}>
              {t === 'find' ? '查找' : '替换'}
            </button>
          ))}
        </div>

        <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
          {/* Search input */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                ref={inputRef}
                value={opts.query}
                onChange={e => update({ query: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') navigateTo(currentIdx + 1); if (e.key === 'Escape') onClose() }}
                placeholder="搜索文本..."
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>
            <button onClick={() => navigateTo(currentIdx - 1)}
              disabled={matches.length === 0}
              style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', background: '#f9fafb', fontSize: 16 }}>
              ↑
            </button>
            <button onClick={() => navigateTo(currentIdx + 1)}
              disabled={matches.length === 0}
              style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', background: '#f9fafb', fontSize: 16 }}>
              ↓
            </button>
          </div>

          {/* Match count */}
          <div style={{ fontSize: 12, color: opts.query ? (matches.length > 0 ? '#16a34a' : '#ef4444') : '#9ca3af', marginBottom: 12 }}>
            {opts.query
              ? matches.length > 0
                ? `找到 ${matches.length} 处匹配 — 当前第 ${currentIdx + 1} 处`
                : '未找到匹配项'
              : '输入搜索词开始查找'}
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
            {[
              { key: 'caseSensitive' as const, label: '区分大小写' },
              { key: 'wholeWord' as const, label: '全字匹配' },
              { key: 'useWildcard' as const, label: '通配符 (* ?)' },
            ].map(opt => (
              <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={!!(opts[opt.key])} onChange={e => update({ [opt.key]: e.target.checked })} />
                {opt.label}
              </label>
            ))}
            <button onClick={() => setShowFormatFilter(p => !p)}
              style={{ padding: '2px 10px', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: showFormatFilter ? '#eff6ff' : '#fff', color: showFormatFilter ? '#2563eb' : '#374151' }}>
              格式筛选 {showFormatFilter ? '▲' : '▼'}
            </button>
          </div>

          {/* Format filter */}
          {showFormatFilter && (
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>格式筛选（仅供参考，不影响文本搜索）</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={opts.bold === true} onChange={e => update({ bold: e.target.checked ? true : null })} />
                  粗体
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={opts.italic === true} onChange={e => update({ italic: e.target.checked ? true : null })} />
                  斜体
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span>颜色：</span>
                  <input type="color" value={opts.color || '#000000'} onChange={e => update({ color: e.target.value })}
                    style={{ width: 28, height: 24, border: '1px solid #d1d5db', borderRadius: 3, cursor: 'pointer' }} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                ⚠️ 通配符规则：? 匹配任意单个字符，* 匹配任意多个字符
              </div>
            </div>
          )}

          {/* Replace */}
          {tab === 'replace' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>替换为</label>
              <input value={replaceText} onChange={e => setReplaceText(e.target.value)}
                placeholder="替换文本..."
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={replaceOne}
                  style={{ flex: 1, padding: '6px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                  替换当前
                </button>
                <button onClick={replaceAll}
                  style={{ flex: 1, padding: '6px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                  全部替换
                </button>
              </div>
            </div>
          )}

          {/* Match list */}
          {matches.length > 0 && (
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>匹配项预览</div>
              <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                {matches.slice(0, 20).map((m, i) => (
                  <div key={i} onClick={() => navigateTo(i)}
                    style={{ padding: '5px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
                      background: currentIdx === i ? '#eff6ff' : 'transparent',
                      borderLeft: `2px solid ${currentIdx === i ? '#3b82f6' : 'transparent'}`,
                      marginBottom: 2 }}
                    dangerouslySetInnerHTML={{ __html: m.context }} />
                ))}
                {matches.length > 20 && (
                  <div style={{ fontSize: 11, color: '#9ca3af', padding: '4px 8px' }}>
                    ... 还有 {matches.length - 20} 项匹配
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '10px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '6px 20px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>关闭</button>
        </div>
      </div>
    </div>
  )
}
