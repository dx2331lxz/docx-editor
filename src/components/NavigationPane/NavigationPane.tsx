/**
 * NavigationPane — left-side outline panel showing document headings.
 * Features: live update, search filter, click-to-scroll, collapsible.
 */
import React, { useEffect, useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { Search, X, ChevronRight, ChevronDown, FileText } from 'lucide-react'

interface NavHeading {
  level: number
  text: string
  pos: number
}

function scanHeadings(editor: Editor): NavHeading[] {
  const headings: NavHeading[] = []
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      const text = node.textContent.trim()
      if (text) {
        headings.push({ level: (node.attrs as { level: number }).level, text, pos })
      }
    }
  })
  return headings
}

interface NavigationPaneProps {
  editor: Editor | null
  onClose: () => void
}

const NavigationPane: React.FC<NavigationPaneProps> = ({ editor, onClose }) => {
  const [headings, setHeadings] = useState<NavHeading[]>([])
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const [activePos, setActivePos] = useState<number | null>(null)

  const rebuild = useCallback(() => {
    if (editor) setHeadings(scanHeadings(editor))
  }, [editor])

  useEffect(() => {
    rebuild()
    editor?.on('update', rebuild)
    return () => { editor?.off('update', rebuild) }
  }, [editor, rebuild])

  // Track cursor position to highlight active heading
  useEffect(() => {
    if (!editor) return
    const handler = () => {
      const { from } = editor.state.selection
      const found = headings.filter((h) => h.pos <= from).pop()
      setActivePos(found?.pos ?? null)
    }
    editor.on('selectionUpdate', handler)
    return () => { editor.off('selectionUpdate', handler) }
  }, [editor, headings])

  const scrollToHeading = (heading: NavHeading) => {
    if (!editor) return
    // Move selection to heading position
    editor.chain().focus().setTextSelection(heading.pos + 1).run()
    // Find heading in DOM and scroll
    const headingEls = document.querySelectorAll('.ProseMirror h1,.ProseMirror h2,.ProseMirror h3,.ProseMirror h4,.ProseMirror h5,.ProseMirror h6')
    for (const el of headingEls) {
      if (el.textContent?.trim() === heading.text) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        break
      }
    }
    setActivePos(heading.pos)
  }

  const filtered = search
    ? headings.filter((h) => h.text.toLowerCase().includes(search.toLowerCase()))
    : headings

  const toggleCollapse = (pos: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(pos) ? next.delete(pos) : next.add(pos)
      return next
    })
  }

  // Determine which headings to show (hide children of collapsed)
  const visibleHeadings: NavHeading[] = []
  let skipUntilLevel: number | null = null
  for (const h of filtered) {
    if (skipUntilLevel !== null) {
      if (h.level > skipUntilLevel) continue
      else skipUntilLevel = null
    }
    visibleHeadings.push(h)
    if (collapsed.has(h.pos)) skipUntilLevel = h.level
  }

  const hasChildren = (h: NavHeading, index: number): boolean => {
    const next = filtered[filtered.indexOf(h) + 1]
    return next ? next.level > h.level : false
  }

  const indentMap: Record<number, string> = { 1: '0', 2: '14px', 3: '28px', 4: '42px', 5: '56px', 6: '70px' }
  const textSizeMap: Record<number, string> = { 1: 'text-sm font-semibold', 2: 'text-xs font-medium', 3: 'text-xs', 4: 'text-xs', 5: 'text-xs', 6: 'text-xs' }

  return (
    <div className="flex flex-col w-56 flex-shrink-0 bg-white border-r border-gray-200 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
          <FileText size={12} className="text-blue-500" />
          导航窗格
        </span>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
      </div>

      {/* Search */}
      <div className="px-2 py-1.5 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-1.5 border border-gray-300 rounded px-2 py-1 bg-white">
          <Search size={12} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="搜索标题…"
            className="flex-1 text-xs outline-none bg-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Heading list */}
      <div className="flex-1 overflow-y-auto py-1">
        {visibleHeadings.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4 px-3">
            {search ? '没有匹配的标题' : '文档中没有标题'}
          </p>
        ) : (
          visibleHeadings.map((h) => {
            const isActive = activePos === h.pos
            const isCollapsed = collapsed.has(h.pos)
            const childExists = hasChildren(h, visibleHeadings.indexOf(h))

            return (
              <div
                key={`${h.pos}-${h.text}`}
                className={`flex items-center gap-1 px-2 py-1 cursor-pointer rounded mx-1 transition-colors ${isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                style={{ paddingLeft: `${(h.level - 1) * 14 + 8}px` }}
                onClick={() => scrollToHeading(h)}
                title={h.text}
              >
                {/* Collapse toggle */}
                <button
                  type="button"
                  className={`flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 ${!childExists ? 'opacity-0 pointer-events-none' : ''}`}
                  onClick={(e) => toggleCollapse(h.pos, e)}
                >
                  {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                </button>
                <span className={`truncate ${textSizeMap[h.level] ?? 'text-xs'}`}>
                  {h.text}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50 flex-shrink-0">
        <span className="text-xs text-gray-400">{headings.length} 个标题</span>
      </div>
    </div>
  )
}

export default NavigationPane
