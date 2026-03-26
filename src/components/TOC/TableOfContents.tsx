/**
 * TableOfContents — scans document headings and inserts a dynamic TOC block.
 * Features: dot leaders, indented levels, refresh button, click-to-scroll.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import React, { useCallback, useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { RefreshCw } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface TOCEntry {
  level: number
  text: string
  pageEst: number  // estimated page number (rough)
}

// ── Heading scanner ────────────────────────────────────────────────────────────

function scanHeadings(editor: Editor): TOCEntry[] {
  const items: TOCEntry[] = []
  let charCount = 0
  const CHARS_PER_PAGE = 800 // rough estimate

  editor.state.doc.descendants((node) => {
    if (node.type.name === 'paragraph' || node.type.name === 'bulletList' || node.type.name === 'orderedList') {
      charCount += node.textContent.length
    }
    if (node.type.name === 'heading') {
      const level = (node.attrs as { level: number }).level
      const text = node.textContent.trim()
      if (text && level <= 3) {
        items.push({ level, text, pageEst: Math.max(1, Math.ceil(charCount / CHARS_PER_PAGE)) })
        charCount += node.textContent.length
      }
    }
  })
  return items
}

// ── NodeView ───────────────────────────────────────────────────────────────────

const TOCNodeView: React.FC<{ editor: Editor; updateAttributes: (attrs: Record<string, unknown>) => void }> = ({ editor }) => {
  const [entries, setEntries] = useState<TOCEntry[]>([])
  const [lastRefreshed, setLastRefreshed] = useState(new Date())

  const refresh = useCallback(() => {
    setEntries(scanHeadings(editor))
    setLastRefreshed(new Date())
  }, [editor])

  // Initial build + rebuild on document change
  useEffect(() => {
    refresh()
    editor.on('update', refresh)
    return () => { editor.off('update', refresh) }
  }, [editor, refresh])

  const scrollToHeading = (text: string) => {
    const headings = document.querySelectorAll('.ProseMirror h1,.ProseMirror h2,.ProseMirror h3,.ProseMirror h4,.ProseMirror h5,.ProseMirror h6')
    for (const el of headings) {
      if (el.textContent?.trim() === text) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        break
      }
    }
  }

  // Indent per level (em)
  const indentMap: Record<number, string> = { 1: '0', 2: '1.5em', 3: '3em' }
  // Font size per level
  const fontSizeMap: Record<number, string> = { 1: '14px', 2: '13px', 3: '12px' }
  const fontWeightMap: Record<number, string> = { 1: '600', 2: '500', 3: '400' }

  return (
    <NodeViewWrapper>
      <div
        className="toc-block my-4 border border-gray-300 rounded bg-white"
        contentEditable={false}
        data-drag-handle
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-300 rounded-t">
          <span className="text-sm font-bold tracking-[0.25em] text-gray-700">目 录</span>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-0.5 rounded transition-colors"
            onClick={refresh}
            title="刷新目录"
          >
            <RefreshCw size={11} />
            刷新
          </button>
        </div>

        {/* Entries */}
        <div className="px-4 py-3 space-y-1">
          {entries.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-2">文档中没有标题（添加标题后自动更新）</p>
          ) : (
            entries.map((entry, i) => (
              <div
                key={i}
                style={{
                  paddingLeft: indentMap[entry.level] ?? '0',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '4px',
                }}
              >
                <button
                  type="button"
                  className="text-left hover:text-blue-600 transition-colors flex-shrink-0 max-w-[70%] truncate"
                  style={{
                    fontSize: fontSizeMap[entry.level] ?? '13px',
                    fontWeight: fontWeightMap[entry.level] ?? '400',
                    color: '#1f2937',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  onClick={() => scrollToHeading(entry.text)}
                  title={`跳转到：${entry.text}`}
                >
                  {entry.text}
                </button>
                {/* Dot leader */}
                <span
                  className="flex-1 overflow-hidden"
                  style={{
                    borderBottom: '1px dotted #9ca3af',
                    marginBottom: '3px',
                    minWidth: '20px',
                  }}
                />
                {/* Page number */}
                <span className="flex-shrink-0 text-xs text-gray-500" style={{ minWidth: '16px', textAlign: 'right' }}>
                  {entry.pageEst}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-1.5 border-t border-gray-200 bg-gray-50 rounded-b flex justify-between items-center">
          <span className="text-xs text-gray-400">共 {entries.length} 项</span>
          <span className="text-xs text-gray-400">
            更新于 {lastRefreshed.getHours().toString().padStart(2,'0')}:{lastRefreshed.getMinutes().toString().padStart(2,'0')}
          </span>
        </div>
      </div>
    </NodeViewWrapper>
  )
}

// ── TipTap Node ────────────────────────────────────────────────────────────────

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableOfContents: {
      insertTableOfContents: () => ReturnType
    }
  }
}

export const TableOfContentsNode = Node.create({
  name: 'tableOfContents',
  group: 'block',
  atom: true,
  draggable: true,

  parseHTML() {
    return [{ tag: 'div[data-type="toc"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'toc' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(TOCNodeView as React.ComponentType<Record<string, unknown>>)
  },

  addCommands() {
    return {
      insertTableOfContents:
        () =>
        ({ chain }) =>
          chain().insertContent({ type: this.name }).run(),
    }
  },
})
