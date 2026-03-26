import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'

export interface DocStyle {
  id: string
  name: string
  isBuiltin: boolean
  headingLevel?: number
  bold?: boolean
  italic?: boolean
  fontSize?: number
  color?: string
}

export const BUILTIN_STYLES: DocStyle[] = [
  { id: 'paragraph', name: '正文', isBuiltin: true },
  { id: 'heading1', name: '标题 1', isBuiltin: true, headingLevel: 1, bold: true, fontSize: 28 },
  { id: 'heading2', name: '标题 2', isBuiltin: true, headingLevel: 2, bold: true, fontSize: 22 },
  { id: 'heading3', name: '标题 3', isBuiltin: true, headingLevel: 3, bold: true, fontSize: 18 },
  { id: 'heading4', name: '标题 4', isBuiltin: true, headingLevel: 4, bold: true, fontSize: 16 },
  { id: 'subtitle', name: '副标题', isBuiltin: true, italic: true, fontSize: 16, color: '#6b7280' },
  { id: 'quote', name: '引用', isBuiltin: true, italic: true, color: '#6b7280' },
]

interface Props {
  editor: Editor | null
  customStyles: DocStyle[]
  onCustomStylesChange: (styles: DocStyle[]) => void
  onClose: () => void
}

const StyleManager: React.FC<Props> = ({ editor, customStyles, onCustomStylesChange, onClose }) => {
  const [selected, setSelected] = useState<DocStyle | null>(null)
  const [newName, setNewName] = useState('')
  const [showNew, setShowNew] = useState(false)
  const allStyles = [...BUILTIN_STYLES, ...customStyles]

  const applyStyle = (style: DocStyle) => {
    if (!editor) return
    if (style.headingLevel) {
      editor.chain().focus().toggleHeading({ level: style.headingLevel as 1|2|3|4|5|6 }).run()
    } else {
      editor.chain().focus().setParagraph().run()
    }
    if (style.bold) editor.chain().focus().setBold().run()
    if (style.italic) editor.chain().focus().setItalic().run()
    if (style.fontSize) (editor.chain().focus() as Record<string, (arg: string) => { run: () => void }>).setFontSize(style.fontSize + 'px').run()
    if (style.color) (editor.chain().focus() as Record<string, (arg: string) => { run: () => void }>).setColor(style.color).run()
    onClose()
  }

  const handleNewStyle = () => {
    if (!newName.trim()) return
    const style: DocStyle = { id: `custom-${Date.now()}`, name: newName.trim(), isBuiltin: false }
    onCustomStylesChange([...customStyles, style])
    setNewName('')
    setShowNew(false)
  }

  const handleDelete = (id: string) => {
    onCustomStylesChange(customStyles.filter(s => s.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">样式管理</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
        </div>

        <div className="border rounded max-h-64 overflow-y-auto mb-3">
          {allStyles.map(style => (
            <div
              key={style.id}
              onClick={() => setSelected(style)}
              className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-blue-50 border-b last:border-b-0 ${selected?.id === style.id ? 'bg-blue-100' : ''}`}
            >
              <div>
                <span className="text-sm font-medium">{style.name}</span>
                {style.isBuiltin && <span className="ml-2 text-xs text-gray-400">内置</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={e => { e.stopPropagation(); applyStyle(style) }}
                  className="text-blue-600 text-xs hover:underline">应用</button>
                {!style.isBuiltin && (
                  <button onClick={e => { e.stopPropagation(); handleDelete(style.id) }}
                    className="text-red-500 text-xs hover:underline">删除</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {showNew ? (
          <div className="flex gap-2 mb-3">
            <input
              className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
              placeholder="新样式名称..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNewStyle()}
              autoFocus
            />
            <button onClick={handleNewStyle} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">确定</button>
            <button onClick={() => setShowNew(false)} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">取消</button>
          </div>
        ) : (
          <button onClick={() => setShowNew(true)} className="w-full py-1.5 border border-dashed border-gray-300 rounded text-sm text-gray-500 hover:bg-gray-50 mb-3">
            + 新建样式
          </button>
        )}

        <button onClick={onClose} className="w-full py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm">关闭</button>
      </div>
    </div>
  )
}

export default StyleManager
