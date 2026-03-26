/**
 * OutlinePanel — 大纲视图面板
 * 显示文档层级结构，支持折叠/展开、提升/降级标题
 */
import React, { useState, useEffect, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { ChevronRight, ChevronDown, ChevronsUp, ChevronsDown } from 'lucide-react'

interface OutlinePanelProps {
  editor: Editor | null
  onClose: () => void
}

interface OutlineEntry {
  level: number
  text: string
  pos: number
  nodeSize: number
  collapsed: boolean
}

function collectOutline(editor: Editor): OutlineEntry[] {
  const entries: OutlineEntry[] = []
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      entries.push({
        level: node.attrs.level as number,
        text: node.textContent.trim() || '(空标题)',
        pos,
        nodeSize: node.nodeSize,
        collapsed: false,
      })
    }
  })
  return entries
}

const OutlinePanel: React.FC<OutlinePanelProps> = ({ editor, onClose }) => {
  const [entries, setEntries] = useState<OutlineEntry[]>([])
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const [showLevel, setShowLevel] = useState(9)

  const refresh = useCallback(() => {
    if (editor) setEntries(collectOutline(editor))
  }, [editor])

  useEffect(() => {
    refresh()
    editor?.on('update', refresh)
    return () => { editor?.off('update', refresh) }
  }, [editor, refresh])

  const scrollToHeading = (entry: OutlineEntry) => {
    if (!editor) return
    editor.commands.focus()
    // Find and scroll to the heading
    const domNode = editor.view.domAtPos(entry.pos + 1)
    if (domNode.node) {
      let el: HTMLElement | null = domNode.node as HTMLElement
      while (el && !['H1','H2','H3','H4','H5','H6'].includes(el.tagName)) {
        el = el.parentElement
      }
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const promoteHeading = (entry: OutlineEntry) => {
    if (!editor || entry.level <= 1) return
    editor.view.dispatch(
      editor.state.tr.setNodeMarkup(entry.pos, undefined, {
        level: entry.level - 1
      })
    )
  }

  const demoteHeading = (entry: OutlineEntry) => {
    if (!editor || entry.level >= 6) return
    editor.view.dispatch(
      editor.state.tr.setNodeMarkup(entry.pos, undefined, {
        level: entry.level + 1
      })
    )
  }

  const toggleCollapse = (pos: number) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(pos)) next.delete(pos)
      else next.add(pos)
      return next
    })
  }

  // Build tree with visibility based on collapsed parents
  const visible = (() => {
    const result: { entry: OutlineEntry; depth: number; hasChildren: boolean }[] = []
    const stack: { level: number; pos: number }[] = []

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]
      if (e.level > showLevel) continue

      // Check if any ancestor is collapsed
      let hidden = false
      for (const anc of stack) {
        if (anc.level < e.level && collapsed.has(anc.pos)) { hidden = true; break }
      }

      // Maintain stack
      while (stack.length > 0 && stack[stack.length - 1].level >= e.level) stack.pop()
      stack.push({ level: e.level, pos: e.pos })

      if (!hidden) {
        const hasChildren = entries.slice(i + 1).some(ne => ne.level > e.level && ne.level <= showLevel)
        result.push({ entry: e, depth: e.level - 1, hasChildren })
      }
    }
    return result
  })()

  const LEVEL_COLORS = ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe']
  const LEVEL_SIZES = ['14px', '13px', '13px', '12px', '12px', '11px']
  const LEVEL_WEIGHTS = ['700', '600', '500', '500', '400', '400']

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-64 flex-shrink-0 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <span className="text-sm font-semibold text-gray-700">大纲视图</span>
        <div className="flex items-center gap-1">
          <select
            className="text-xs border border-gray-200 rounded px-1 py-0.5"
            value={showLevel}
            onChange={e => setShowLevel(parseInt(e.target.value))}
            title="显示级别"
          >
            {[1,2,3,4,5,6,9].map(l => (
              <option key={l} value={l}>{l === 9 ? '全部' : `${l}级`}</option>
            ))}
          </select>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-base leading-none ml-1">×</button>
        </div>
      </div>

      {/* Outline tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {visible.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-8 px-4">
            文档中没有标题。<br/>使用"标题1"等样式来构建大纲。
          </div>
        ) : (
          visible.map(({ entry, depth, hasChildren }) => (
            <div
              key={entry.pos}
              className="group flex items-center gap-1 px-2 py-0.5 hover:bg-blue-50 cursor-pointer rounded mx-1"
              style={{ paddingLeft: `${depth * 14 + 4}px` }}
            >
              {/* Collapse toggle */}
              <button
                className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0"
                onClick={e => { e.stopPropagation(); if (hasChildren) toggleCollapse(entry.pos) }}
              >
                {hasChildren ? (
                  collapsed.has(entry.pos) ? <ChevronRight size={10} /> : <ChevronDown size={10} />
                ) : <span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />}
              </button>

              {/* Heading text */}
              <span
                className="flex-1 truncate"
                style={{
                  fontSize: LEVEL_SIZES[entry.level - 1],
                  fontWeight: LEVEL_WEIGHTS[entry.level - 1],
                  color: LEVEL_COLORS[entry.level - 1],
                }}
                onClick={() => scrollToHeading(entry)}
                title={entry.text}
              >
                {entry.text}
              </span>

              {/* Level badge */}
              <span className="text-xs text-gray-300 group-hover:text-gray-500 mr-1 flex-shrink-0">H{entry.level}</span>

              {/* Promote/demote buttons - shown on hover */}
              <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 flex-shrink-0">
                <button
                  className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-blue-600"
                  onClick={e => { e.stopPropagation(); promoteHeading(entry) }}
                  title="提升级别"
                  disabled={entry.level <= 1}
                >
                  <ChevronsUp size={10} />
                </button>
                <button
                  className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-blue-600"
                  onClick={e => { e.stopPropagation(); demoteHeading(entry) }}
                  title="降低级别"
                  disabled={entry.level >= 6}
                >
                  <ChevronsDown size={10} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t bg-gray-50 text-xs text-gray-400">
        {entries.length} 个标题 · 点击跳转 · 拖拽升降级
      </div>
    </div>
  )
}

export default OutlinePanel
