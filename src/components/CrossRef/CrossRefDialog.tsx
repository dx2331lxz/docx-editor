/**
 * CrossReferenceDialog — 交叉引用对话框
 * 支持：引用类型（标题/书签/图表）、引用内容（标题文本/页码）
 */
import React, { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/react'

interface CrossRefDialogProps {
  editor: Editor | null
  onClose: () => void
}

type RefType = 'heading' | 'bookmark' | 'figure'
type RefContent = 'text' | 'page'

interface RefItem {
  id: string
  label: string
  text: string
}

function collectHeadings(editor: Editor | null): RefItem[] {
  if (!editor) return []
  const items: RefItem[] = []
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      const text = node.textContent.trim()
      if (text) {
        items.push({ id: `h-${pos}`, label: `H${node.attrs.level}: ${text}`, text })
      }
    }
  })
  return items
}

function collectBookmarks(editor: Editor | null): RefItem[] {
  if (!editor) return []
  const items: RefItem[] = []
  editor.state.doc.descendants((node) => {
    node.marks.forEach(m => {
      if (m.type.name === 'bookmark' && m.attrs.id) {
        items.push({ id: m.attrs.id, label: m.attrs.id, text: m.attrs.id })
      }
    })
  })
  return items
}

function collectFigures(editor: Editor | null): RefItem[] {
  if (!editor) return []
  const items: RefItem[] = []
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'resizableImage' || node.type.name === 'image') {
      const cap = node.attrs.caption || node.attrs.alt || '图片'
      if (cap) items.push({ id: cap, label: cap, text: cap })
    }
  })
  return items
}

const CrossRefDialog: React.FC<CrossRefDialogProps> = ({ editor, onClose }) => {
  const [refType, setRefType] = useState<RefType>('heading')
  const [refContent, setRefContent] = useState<RefContent>('text')
  const [selected, setSelected] = useState<RefItem | null>(null)
  const [items, setItems] = useState<RefItem[]>([])

  useEffect(() => {
    if (refType === 'heading') setItems(collectHeadings(editor))
    else if (refType === 'bookmark') setItems(collectBookmarks(editor))
    else setItems(collectFigures(editor))
    setSelected(null)
  }, [refType, editor])

  const handleInsert = () => {
    if (!editor || !selected) return
    const displayText = refContent === 'page' ? `第[${selected.text}]页` : selected.text
    const html = `<span class="cross-ref" data-ref-type="${refType}" data-ref-id="${selected.id}" data-ref-content="${refContent}" contenteditable="false" style="color:#2563eb;text-decoration:underline;cursor:pointer;border-bottom:1px dashed #93c5fd;padding:0 1px;" title="交叉引用: ${selected.text}">${displayText}</span>`
    editor.chain().focus().insertContent(html).run()
    onClose()
  }

  const TYPE_LABELS: Record<RefType, string> = { heading: '标题', bookmark: '书签', figure: '图表' }
  const CONTENT_LABELS: Record<RefContent, string> = { text: '标题文本', page: '页码' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-96 p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-4 text-gray-800">交叉引用</h3>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">引用类型</label>
            <select
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={refType}
              onChange={e => setRefType(e.target.value as RefType)}
            >
              {(Object.entries(TYPE_LABELS) as [RefType, string][]).map(([t, l]) => (
                <option key={t} value={t}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">引用内容</label>
            <select
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={refContent}
              onChange={e => setRefContent(e.target.value as RefContent)}
            >
              {(Object.entries(CONTENT_LABELS) as [RefContent, string][]).map(([c, l]) => (
                <option key={c} value={c}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">
            {TYPE_LABELS[refType]}列表
            <span className="text-gray-400 ml-1">({items.length}个)</span>
          </label>
          <div className="border border-gray-200 rounded overflow-y-auto max-h-48 min-h-20 bg-gray-50">
            {items.length === 0 ? (
              <div className="p-3 text-sm text-gray-400 text-center">
                文档中没有找到{TYPE_LABELS[refType]}
              </div>
            ) : (
              items.map(item => (
                <button
                  key={item.id}
                  className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 last:border-0 transition-colors ${selected?.id === item.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-white text-gray-700'}`}
                  onClick={() => setSelected(item)}
                >
                  {item.label}
                </button>
              ))
            )}
          </div>
        </div>

        {selected && (
          <div className="mb-4 p-2 bg-blue-50 rounded text-sm text-blue-700">
            将插入："{refContent === 'page' ? `第[${selected.text}]页` : selected.text}"
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded" onClick={onClose}>取消</button>
          <button
            className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleInsert}
            disabled={!selected}
          >
            插入
          </button>
        </div>
      </div>
    </div>
  )
}

export default CrossRefDialog
