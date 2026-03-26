import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import { X } from 'lucide-react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

interface FindReplaceDialogProps {
  editor: Editor
  mode: 'find' | 'replace'
  onClose: () => void
}

interface Match {
  from: number
  to: number
}

// Plugin key for find highlights
const findHighlightKey = new PluginKey('findHighlight')

function applyFindHighlights(editor: Editor, matches: Match[], currentIdx: number) {
  // Use a ProseMirror transaction to add decorations via a plugin
  // We'll use the editor's view directly to add decorations
  const { state, view } = editor
  const decorations = matches.map((m, i) =>
    Decoration.inline(m.from, m.to, {
      class: i === currentIdx ? 'find-highlight-current' : 'find-highlight',
    })
  )
  const decoSet = DecorationSet.create(state.doc, decorations)
  // Store in a meta transaction so we can clean up
  const tr = state.tr.setMeta(findHighlightKey, decoSet)
  view.dispatch(tr)
}

function clearFindHighlights(editor: Editor) {
  const { state, view } = editor
  const tr = state.tr.setMeta(findHighlightKey, DecorationSet.empty)
  view.dispatch(tr)
}

// Install the highlight plugin into the editor once
function ensureHighlightPlugin(editor: Editor) {
  const { state } = editor
  if (findHighlightKey.get(state)) return // already installed
  const plugin = new Plugin({
    key: findHighlightKey,
    state: {
      init() { return DecorationSet.empty },
      apply(tr, old) {
        const meta = tr.getMeta(findHighlightKey)
        if (meta !== undefined) return meta as DecorationSet
        return old.map(tr.mapping, tr.doc)
      },
    },
    props: {
      decorations(state) {
        return findHighlightKey.getState(state) as DecorationSet
      },
    },
  })
  // Register plugin by reconfiguring the state
  const newState = state.reconfigure({ plugins: [...state.plugins, plugin] })
  editor.view.updateState(newState)
}

function findMatches(editor: Editor, term: string, useRegex: boolean): Match[] {
  if (!term) return []
  const matches: Match[] = []
  let regex: RegExp
  try {
    regex = useRegex ? new RegExp(term, 'gi') : new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  } catch { return [] }
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    let match: RegExpExecArray | null
    regex.lastIndex = 0
    while ((match = regex.exec(node.text)) !== null) {
      matches.push({ from: pos + match.index, to: pos + match.index + match[0].length })
    }
  })
  return matches
}

const FindReplaceDialog: React.FC<FindReplaceDialogProps> = ({ editor, mode: initialMode, onClose }) => {
  const [activeTab, setActiveTab] = useState<'find' | 'replace'>(initialMode)
  const [searchText, setSearchText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [useRegex, setUseRegex] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchInputRef.current?.focus()
    ensureHighlightPlugin(editor)
  }, [])

  useEffect(() => {
    const m = findMatches(editor, searchText, useRegex)
    setMatches(m)
    setCurrentIndex(0)
    // Apply all-match highlights
    if (m.length > 0) {
      applyFindHighlights(editor, m, 0)
    } else {
      clearFindHighlights(editor)
    }
    editor.commands.setSearchTerm(searchText)
  }, [searchText, useRegex, editor])

  const goToMatch = useCallback((index: number) => {
    if (matches.length === 0) return
    const m = matches[index]
    editor.chain().focus().setTextSelection({ from: m.from, to: m.to }).run()
    // Update decorations to highlight current match differently
    applyFindHighlights(editor, matches, index)
    const view = editor.view
    const coords = view.coordsAtPos(m.from)
    const editorEl = view.dom.closest('.overflow-auto') ?? document.documentElement
    if (editorEl) {
      const rect = editorEl.getBoundingClientRect()
      const relY = coords.top - rect.top + editorEl.scrollTop - rect.height / 2
      editorEl.scrollTo({ top: relY, behavior: 'smooth' })
    }
  }, [matches, editor])

  const handlePrev = () => {
    if (matches.length === 0) return
    const idx = (currentIndex - 1 + matches.length) % matches.length
    setCurrentIndex(idx)
    goToMatch(idx)
  }

  const handleNext = () => {
    if (matches.length === 0) return
    const idx = (currentIndex + 1) % matches.length
    setCurrentIndex(idx)
    goToMatch(idx)
  }

  const handleReplace = () => {
    if (matches.length === 0) return
    const m = matches[currentIndex]
    editor.chain().focus()
      .setTextSelection({ from: m.from, to: m.to })
      .insertContent(replaceText)
      .run()
    const newMatches = findMatches(editor, searchText, useRegex)
    setMatches(newMatches)
    applyFindHighlights(editor, newMatches, Math.min(currentIndex, newMatches.length - 1))
    setCurrentIndex(Math.min(currentIndex, newMatches.length - 1))
  }

  const handleReplaceAll = () => {
    if (!searchText) return
    const ms = findMatches(editor, searchText, useRegex)
    for (let i = ms.length - 1; i >= 0; i--) {
      editor.chain()
        .setTextSelection({ from: ms[i].from, to: ms[i].to })
        .insertContent(replaceText)
        .run()
    }
    setMatches([])
    setCurrentIndex(0)
    clearFindHighlights(editor)
    editor.commands.clearSearch()
  }

  const handleClose = useCallback(() => {
    clearFindHighlights(editor)
    editor.commands.clearSearch()
    onClose()
  }, [editor, onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handleClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="bg-white rounded-lg shadow-xl w-96 flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex gap-3">
            <button
              className={`text-sm font-medium pb-0.5 border-b-2 transition-colors ${activeTab === 'find' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('find')}
            >查找</button>
            <button
              className={`text-sm font-medium pb-0.5 border-b-2 transition-colors ${activeTab === 'replace' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('replace')}
            >查找替换</button>
          </div>
          <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={handleClose}><X size={16} /></button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm text-gray-600 font-medium">查找内容</label>
              <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={useRegex} onChange={e => setUseRegex(e.target.checked)} className="w-3 h-3" />
                正则表达式
              </label>
            </div>
            <div className="flex gap-2">
              <input
                ref={searchInputRef}
                type="text"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleNext() }}
                className={`flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${useRegex ? 'border-orange-300 bg-orange-50' : 'border-gray-300'}`}
                placeholder={useRegex ? '正则表达式...' : '输入查找内容…'}
              />
              {matches.length > 0 && (
                <span className="text-xs text-gray-500 self-center whitespace-nowrap">
                  共{matches.length}处 ({currentIndex + 1}/{matches.length})
                </span>
              )}
              {searchText && matches.length === 0 && (
                <span className="text-xs text-red-400 self-center whitespace-nowrap">未找到</span>
              )}
            </div>
          </div>

          {activeTab === 'replace' && (
            <div>
              <label className="text-sm text-gray-600 font-medium block mb-1">替换为</label>
              <input
                type="text"
                value={replaceText}
                onChange={e => setReplaceText(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="输入替换内容…"
              />
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <button
              className="border border-gray-300 rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
              onClick={handlePrev}
              disabled={matches.length === 0}
            >上一个</button>
            <button
              className="border border-gray-300 rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
              onClick={handleNext}
              disabled={matches.length === 0}
            >下一个</button>
            {activeTab === 'replace' && (
              <>
                <button
                  className="bg-blue-600 text-white rounded px-3 py-1 text-sm hover:bg-blue-700 transition-colors disabled:opacity-40"
                  onClick={handleReplace}
                  disabled={matches.length === 0}
                >替换</button>
                <button
                  className="bg-blue-600 text-white rounded px-3 py-1 text-sm hover:bg-blue-700 transition-colors disabled:opacity-40"
                  onClick={handleReplaceAll}
                  disabled={!searchText}
                >全部替换</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FindReplaceDialog
