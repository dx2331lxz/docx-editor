/**
 * CitationsDialog — 引用管理
 * 支持：书籍/期刊/网页引用源，APA/MLA/GB/T 7714格式
 * 自动生成参考文献列表
 */
import React, { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/react'

interface CitationsDialogProps {
  editor: Editor | null
  onClose: () => void
}

type SourceType = 'book' | 'journal' | 'website' | 'conference'
type CitationStyle = 'apa' | 'mla' | 'gbt7714' | 'chicago'

interface CitationSource {
  id: string
  type: SourceType
  title: string
  authors: string
  year: string
  publisher?: string
  journal?: string
  volume?: string
  issue?: string
  pages?: string
  url?: string
  doi?: string
  accessDate?: string
}

const STYLE_LABELS: Record<CitationStyle, string> = {
  apa: 'APA (第7版)',
  mla: 'MLA (第9版)',
  gbt7714: 'GB/T 7714-2015',
  chicago: 'Chicago',
}

const TYPE_LABELS: Record<SourceType, string> = {
  book: '📚 书籍',
  journal: '📰 期刊',
  website: '🌐 网页',
  conference: '🎤 会议论文',
}

function formatCitation(src: CitationSource, style: CitationStyle, index: number): string {
  const authorsArr = src.authors.split(/[,;，；]/).map(a => a.trim()).filter(Boolean)
  const firstAuthor = authorsArr[0] || '佚名'
  const year = src.year || 'n.d.'

  switch (style) {
    case 'apa': {
      const authorStr = authorsArr.length > 1
        ? authorsArr.slice(0, -1).join(', ') + ', & ' + authorsArr[authorsArr.length - 1]
        : firstAuthor
      if (src.type === 'book') return `${authorStr} (${year}). *${src.title}*. ${src.publisher || ''}.`
      if (src.type === 'journal') return `${authorStr} (${year}). ${src.title}. *${src.journal || ''}*, *${src.volume || ''}*(${src.issue || ''}), ${src.pages || ''}. ${src.doi ? `https://doi.org/${src.doi}` : ''}`
      if (src.type === 'website') return `${authorStr} (${year}). *${src.title}*. Retrieved from ${src.url || ''}`
      return `${authorStr} (${year}). ${src.title}. In *Conference Proceedings*, ${src.pages || ''}.`
    }
    case 'mla': {
      const authorMLA = authorsArr.length > 1
        ? `${firstAuthor}, et al`
        : firstAuthor
      if (src.type === 'book') return `${authorMLA}. *${src.title}*. ${src.publisher || ''}, ${year}.`
      if (src.type === 'journal') return `${authorMLA}. "${src.title}." *${src.journal || ''}*, vol. ${src.volume || ''}, no. ${src.issue || ''}, ${year}, pp. ${src.pages || ''}.`
      return `${authorMLA}. "${src.title}." *Web*. ${src.accessDate || year}.`
    }
    case 'gbt7714': {
      const authorGB = authorsArr.slice(0, 3).join(',') + (authorsArr.length > 3 ? ',等' : '')
      if (src.type === 'book') return `[${index}] ${authorGB}. ${src.title}[M]. ${src.publisher || ''}, ${year}.`
      if (src.type === 'journal') return `[${index}] ${authorGB}. ${src.title}[J]. ${src.journal || ''}, ${year}, ${src.volume || ''}(${src.issue || ''}): ${src.pages || ''}.`
      if (src.type === 'website') return `[${index}] ${authorGB}. ${src.title}[EB/OL]. (${year})[${src.accessDate || ''}]. ${src.url || ''}.`
      return `[${index}] ${authorGB}. ${src.title}[C]. ${src.publisher || ''}, ${year}: ${src.pages || ''}.`
    }
    case 'chicago': {
      if (src.type === 'book') return `${firstAuthor}. *${src.title}*. ${src.publisher || ''}, ${year}.`
      if (src.type === 'journal') return `${firstAuthor}. "${src.title}." *${src.journal || ''}* ${src.volume || ''}, no. ${src.issue || ''} (${year}): ${src.pages || ''}.`
      return `${firstAuthor}. "${src.title}." Last modified ${year}. ${src.url || ''}.`
    }
  }
}

function inlineCite(src: CitationSource, style: CitationStyle, index: number): string {
  switch (style) {
    case 'apa': return `(${src.authors.split(/[,;，；]/)[0].trim()}, ${src.year || 'n.d.'})`
    case 'mla': return `(${src.authors.split(/[,;，；]/)[0].trim()} ${src.year || ''})`
    case 'gbt7714': return `[${index}]`
    case 'chicago': return `(${src.authors.split(/[,;，；]/)[0].trim()}, ${src.year || 'n.d.'})`
  }
}

const STORAGE_KEY = 'docx-editor-citations'

const CitationsDialog: React.FC<CitationsDialogProps> = ({ editor, onClose }) => {
  const [sources, setSources] = useState<CitationSource[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [style, setStyle] = useState<CitationStyle>('gbt7714')
  const [tab, setTab] = useState<'list' | 'add' | 'bibliography'>('list')
  const [editing, setEditing] = useState<CitationSource | null>(null)

  const defaultNew = (): CitationSource => ({
    id: `cit-${Date.now()}`, type: 'book', title: '', authors: '',
    year: new Date().getFullYear().toString(), publisher: '', journal: '',
    volume: '', issue: '', pages: '', url: '', doi: '', accessDate: '',
  })
  const [form, setForm] = useState<CitationSource>(defaultNew())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sources))
  }, [sources])

  const saveForm = () => {
    if (!form.title.trim() || !form.authors.trim()) return
    if (editing) {
      setSources(s => s.map(x => x.id === editing.id ? { ...form, id: editing.id } : x))
    } else {
      setSources(s => [...s, { ...form, id: `cit-${Date.now()}` }])
    }
    setForm(defaultNew())
    setEditing(null)
    setTab('list')
  }

  const insertCite = (src: CitationSource) => {
    if (!editor) return
    const idx = sources.indexOf(src) + 1
    const citeText = inlineCite(src, style, idx)
    const html = `<cite class="citation-ref" data-cit-id="${src.id}" style="color:#2563eb;font-style:normal;cursor:pointer;border-bottom:1px dashed #93c5fd;" title="${src.title}">${citeText}</cite>`
    editor.chain().focus().insertContent(html).run()
  }

  const insertBibliography = () => {
    if (!editor || !sources.length) return
    const rows = sources.map((s, i) => `<li style="margin-bottom:4px;font-size:13px;line-height:1.5;">${formatCitation(s, style, i + 1)}</li>`).join('')
    const html = `<div class="bibliography" contenteditable="false" style="border-top:2px solid #374151;margin-top:24px;padding-top:12px;">
      <div style="font-size:14px;font-weight:600;margin-bottom:8px;">参考文献</div>
      <ol style="padding-left:${style === 'gbt7714' ? '0' : '1.5em'};list-style:${style === 'gbt7714' ? 'none' : 'decimal'};">${rows}</ol>
    </div>`
    editor.chain().focus().insertContent(html).run()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[600px] flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-base font-semibold text-gray-800">引用管理</h3>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">样式：</label>
            <select
              className="border border-gray-300 rounded px-2 py-1 text-sm"
              value={style}
              onChange={e => setStyle(e.target.value as CitationStyle)}
            >
              {(Object.entries(STYLE_LABELS) as [CitationStyle, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {(['list', 'add', 'bibliography'] as const).map(t => (
            <button
              key={t}
              className={`px-4 py-2 text-sm border-b-2 transition-colors ${tab === t ? 'border-blue-500 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => { setTab(t); if (t === 'add') { setEditing(null); setForm(defaultNew()) } }}
            >
              {t === 'list' ? `📚 引用源 (${sources.length})` : t === 'add' ? '+ 添加' : '📄 参考文献'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Sources list */}
          {tab === 'list' && (
            <div>
              {sources.length === 0 ? (
                <div className="text-center text-gray-400 py-12 text-sm">
                  还没有引用源。点击"添加"来添加参考文献。
                </div>
              ) : (
                <div className="space-y-2">
                  {sources.map((s, i) => (
                    <div key={s.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{TYPE_LABELS[s.type]}</span>
                            <span className="text-xs text-gray-400">{s.year}</span>
                          </div>
                          <div className="text-sm font-medium text-gray-800 truncate">{s.title || '(无标题)'}</div>
                          <div className="text-xs text-gray-500 truncate">{s.authors}</div>
                          <div className="text-xs text-gray-400 mt-1 italic">{formatCitation(s, style, i + 1)}</div>
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button
                            className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600"
                            onClick={() => insertCite(s)}
                          >
                            插入引用
                          </button>
                          <button
                            className="text-xs px-2 py-0.5 border border-gray-300 text-gray-600 rounded hover:bg-gray-100"
                            onClick={() => { setEditing(s); setForm({ ...s }); setTab('add') }}
                          >
                            编辑
                          </button>
                          <button
                            className="text-xs px-2 py-0.5 border border-red-200 text-red-500 rounded hover:bg-red-50"
                            onClick={() => setSources(ss => ss.filter(x => x.id !== s.id))}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Add/edit form */}
          {tab === 'add' && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">{editing ? '编辑引用源' : '添加引用源'}</h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">类型</label>
                  <select
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as SourceType }))}
                  >
                    {(Object.entries(TYPE_LABELS) as [SourceType, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">年份</label>
                  <input type="text" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">题名 *</label>
                <input type="text" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                  placeholder="文章/书籍标题" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">作者 * (多人用逗号分隔)</label>
                <input type="text" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                  placeholder="张三, 李四, 王五" value={form.authors}
                  onChange={e => setForm(f => ({ ...f, authors: e.target.value }))} />
              </div>

              {(form.type === 'book' || form.type === 'conference') && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">出版社/会议</label>
                  <input type="text" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    value={form.publisher} onChange={e => setForm(f => ({ ...f, publisher: e.target.value }))} />
                </div>
              )}

              {form.type === 'journal' && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">期刊名</label>
                    <input type="text" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      value={form.journal} onChange={e => setForm(f => ({ ...f, journal: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">卷(Vol)</label>
                    <input type="text" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      value={form.volume} onChange={e => setForm(f => ({ ...f, volume: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">期(No)</label>
                    <input type="text" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      value={form.issue} onChange={e => setForm(f => ({ ...f, issue: e.target.value }))} />
                  </div>
                </div>
              )}

              {form.type === 'website' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">网址</label>
                  <input type="url" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    placeholder="https://..." value={form.url}
                    onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-500 mb-1">页码</label>
                <input type="text" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                  placeholder="1-15" value={form.pages}
                  onChange={e => setForm(f => ({ ...f, pages: e.target.value }))} />
              </div>

              {/* Preview */}
              {form.title && form.authors && (
                <div className="p-3 bg-gray-50 rounded text-xs text-gray-600 italic">
                  预览：{formatCitation(form, style, sources.length + 1)}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-1">
                <button className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded border"
                  onClick={() => { setTab('list'); setEditing(null); setForm(defaultNew()) }}>
                  取消
                </button>
                <button
                  className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  onClick={saveForm}
                  disabled={!form.title.trim() || !form.authors.trim()}
                >
                  {editing ? '保存修改' : '添加引用源'}
                </button>
              </div>
            </div>
          )}

          {/* Bibliography */}
          {tab === 'bibliography' && (
            <div>
              {sources.length === 0 ? (
                <div className="text-center text-gray-400 py-8 text-sm">还没有引用源</div>
              ) : (
                <>
                  <div className="mb-3 p-3 border-b-2 border-gray-800">
                    <div className="font-semibold text-sm mb-2">参考文献</div>
                    <ol className={`space-y-2 text-xs ${style === 'gbt7714' ? 'list-none pl-0' : 'list-decimal pl-5'}`}>
                      {sources.map((s, i) => (
                        <li key={s.id} className="text-gray-700 leading-relaxed">
                          {formatCitation(s, style, i + 1)}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <button
                    className="w-full py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    onClick={insertBibliography}
                  >
                    插入参考文献列表到文档
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CitationsDialog
