/**
 * Footnote / Endnote TipTap Extensions
 *
 * FootnoteRef  — inline superscript mark rendered as ①②… or [1][2]…
 *                Clicking jumps to the footnote entry below.
 *
 * FootnoteSection — block node at bottom of document that holds all footnote
 *                   entries. Entries are rendered as an editable list.
 *
 * Commands:
 *   editor.commands.insertFootnote()   — inserts ref + section entry
 *   editor.commands.insertEndnote()    — inserts endnote (same mechanism, different label)
 */

import { Mark, Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import React, { useEffect, useState, useRef } from 'react'
import type { Editor } from '@tiptap/react'

// ── Superscript circles for up to 20 footnotes ────────────────────────────────
const CIRCLES = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩',
  '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳']
export function circleFor(n: number) { return CIRCLES[n - 1] ?? `[${n}]` }

// ────────────────────────────────────────────────────────────────────────────
// FootnoteRef — inline mark (renders as superscript number)
// ────────────────────────────────────────────────────────────────────────────

export const FootnoteRef = Mark.create({
  name: 'footnoteRef',
  spanning: false,
  excludes: '_',

  addAttributes() {
    return {
      id: { default: '' },
      index: { default: 1 },
      type: { default: 'footnote' }, // 'footnote' | 'endnote'
    }
  },

  parseHTML() {
    return [{ tag: 'sup[data-footnote-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['sup', mergeAttributes(HTMLAttributes, {
      'data-footnote-id': HTMLAttributes.id,
      'data-footnote-type': HTMLAttributes.type,
      class: 'footnote-ref',
      title: `跳转到脚注 ${HTMLAttributes.index}`,
    }), circleFor(HTMLAttributes.index as number)]
  },
})

// ────────────────────────────────────────────────────────────────────────────
// FootnoteSection — block node that holds all footnotes at page bottom
// ────────────────────────────────────────────────────────────────────────────

interface FootnoteEntry {
  id: string
  index: number
  type: 'footnote' | 'endnote'
  content: string
}

function collectFootnotes(editor: Editor): FootnoteEntry[] {
  const entries: FootnoteEntry[] = []
  editor.state.doc.descendants((node) => {
    node.marks.forEach((mark) => {
      if (mark.type.name === 'footnoteRef') {
        const { id, index, type } = mark.attrs as { id: string; index: number; type: string }
        if (!entries.find((e) => e.id === id)) {
          entries.push({ id, index, type: type as 'footnote' | 'endnote', content: '' })
        }
      }
    })
  })
  return entries.sort((a, b) => a.index - b.index)
}

const FootnoteSectionView: React.FC<{
  node: { attrs: { notes: string } }
  updateAttributes: (attrs: Record<string, unknown>) => void
  editor: Editor
}> = ({ node, updateAttributes, editor }) => {
  const [footnotes, setFootnotes] = useState<FootnoteEntry[]>([])
  const [endnotes, setEndnotes] = useState<FootnoteEntry[]>([])
  const notesRef = useRef<Record<string, string>>({})

  // Parse stored notes
  useEffect(() => {
    try {
      notesRef.current = JSON.parse(node.attrs.notes || '{}')
    } catch { notesRef.current = {} }
  }, [node.attrs.notes])

  const rebuild = () => {
    const all = collectFootnotes(editor)
    const fn = all.filter((e) => e.type === 'footnote').map((e) => ({
      ...e, content: notesRef.current[e.id] ?? '',
    }))
    const en = all.filter((e) => e.type === 'endnote').map((e) => ({
      ...e, content: notesRef.current[e.id] ?? '',
    }))
    setFootnotes(fn)
    setEndnotes(en)
  }

  useEffect(() => {
    rebuild()
    editor.on('update', rebuild)
    return () => { editor.off('update', rebuild) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  const updateNote = (id: string, content: string) => {
    notesRef.current = { ...notesRef.current, [id]: content }
    updateAttributes({ notes: JSON.stringify(notesRef.current) })
  }

  const scrollToRef = (id: string) => {
    const refs = document.querySelectorAll(`sup[data-footnote-id="${id}"]`)
    refs[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  if (footnotes.length === 0 && endnotes.length === 0) return null

  const renderList = (entries: FootnoteEntry[], label: string) => (
    <div className="footnote-list">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-gray-500 tracking-widest uppercase">{label}</span>
        <div className="flex-1 border-t border-gray-300" />
      </div>
      {entries.map((entry) => (
        <div key={entry.id} id={`fn-${entry.id}`} className="flex items-start gap-1.5 mb-1 group">
          <button
            type="button"
            className="text-xs text-blue-600 hover:text-blue-800 flex-shrink-0 mt-0.5 font-medium"
            title="跳回正文"
            onClick={() => scrollToRef(entry.id)}
          >
            {circleFor(entry.index)}
          </button>
          <input
            type="text"
            className="flex-1 text-xs text-gray-700 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-400 outline-none py-0.5"
            placeholder={`输入${label}内容…`}
            value={entry.content}
            onChange={(e) => updateNote(entry.id, e.target.value)}
          />
        </div>
      ))}
    </div>
  )

  return (
    <NodeViewWrapper>
      <div
        className="footnote-section mt-6 pt-2 border-t-2 border-gray-200"
        contentEditable={false}
        data-drag-handle={undefined}
      >
        {footnotes.length > 0 && renderList(footnotes, '脚注')}
        {endnotes.length > 0 && renderList(endnotes, '尾注')}
      </div>
    </NodeViewWrapper>
  )
}

export const FootnoteSectionNode = Node.create({
  name: 'footnoteSection',
  group: 'block',
  atom: true,
  draggable: false,
  selectable: false,

  addAttributes() {
    return {
      notes: { default: '{}' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="footnote-section"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'footnote-section' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(FootnoteSectionView as React.ComponentType<Record<string, unknown>>)
  },
})

// ────────────────────────────────────────────────────────────────────────────
// Commands extension
// ────────────────────────────────────────────────────────────────────────────

import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    footnoteCommands: {
      insertFootnote: () => ReturnType
      insertEndnote: () => ReturnType
    }
  }
}

/** Count existing footnote refs of a given type */
function countRefs(editor: Editor, type: 'footnote' | 'endnote'): number {
  let count = 0
  editor.state.doc.descendants((node) => {
    node.marks.forEach((mark) => {
      if (mark.type.name === 'footnoteRef' && mark.attrs.type === type) count++
    })
  })
  return count
}

/** Ensure a FootnoteSectionNode exists at end of doc */
function ensureSection(editor: Editor, chain: ReturnType<Editor['chain']>): ReturnType<Editor['chain']> {
  let hasSec = false
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'footnoteSection') hasSec = true
  })
  if (!hasSec) {
    chain.insertContentAt(editor.state.doc.content.size, { type: 'footnoteSection', attrs: { notes: '{}' } })
  }
  return chain
}

export const FootnoteCommandsExtension = Extension.create({
  name: 'footnoteCommands',

  addCommands() {
    return {
      insertFootnote: () => ({ editor, chain }) => {
        const index = countRefs(editor, 'footnote') + 1
        const id = `fn-${Date.now()}`
        const savedPos = editor.state.selection.from

        // Insert the superscript ref at cursor
        chain()
          .focus()
          .insertContent([{
            type: 'text',
            text: circleFor(index),
            marks: [{ type: 'footnoteRef', attrs: { id, index, type: 'footnote' } }],
          }])

        ensureSection(editor, chain)
        chain.run()

        // Scroll to footnote section after a tick
        setTimeout(() => {
          const el = document.querySelector('.footnote-section')
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)

        return true
      },

      insertEndnote: () => ({ editor, chain }) => {
        const index = countRefs(editor, 'endnote') + 1
        const id = `en-${Date.now()}`

        chain()
          .focus()
          .insertContent([{
            type: 'text',
            text: circleFor(index),
            marks: [{ type: 'footnoteRef', attrs: { id, index, type: 'endnote' } }],
          }])

        ensureSection(editor, chain)
        chain.run()
        return true
      },
    }
  },
})
