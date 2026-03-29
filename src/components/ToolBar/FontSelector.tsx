import React from 'react'
import ReactDOM from 'react-dom'
import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import { ChevronDown } from 'lucide-react'
import { useDropdownPortal } from '../../hooks/useDropdownPortal'

interface FontSelectorProps {
  editor: Editor | null
}

const FONT_FAMILIES = [
  { label: '宋体',             value: 'SimSun, serif' },
  { label: '黑体',             value: 'SimHei, sans-serif' },
  { label: '楷体',             value: 'KaiTi, serif' },
  { label: '仿宋',             value: 'FangSong, serif' },
  { label: '微软雅黑',         value: '"Microsoft YaHei", sans-serif' },
  { label: '方正书宋',         value: '"FangZhengShuSong", serif' },
  { label: 'Calibri',         value: 'Calibri, sans-serif' },
  { label: 'Arial',           value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Georgia',         value: 'Georgia, serif' },
]

// Default font shown when no explicit font is set
const DEFAULT_FONT = FONT_FAMILIES[0]

const FontSelector: React.FC<FontSelectorProps> = ({ editor }) => {
  const { triggerRef, dropdownRef, open, pos, toggleDropdown, closeDropdown } = useDropdownPortal()

  // Reactively read font from editor state on every selection/transaction update
  const currentFont = useEditorState({
    editor,
    selector: (ctx) =>
      (ctx.editor?.getAttributes('textStyle')?.fontFamily as string | undefined) ?? '',
  })

  // DOM fallback when no explicit fontFamily mark is set
  const resolvedFont = (() => {
    if (currentFont) return currentFont
    if (!editor) return ''
    try {
      const sel = editor.view.state.selection
      const domInfo = editor.view.domAtPos(sel.from)
      let node = domInfo.node as HTMLElement | null
      if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement
      if (node) return window.getComputedStyle(node).fontFamily
    } catch { /* ignore */ }
    return ''
  })()

  const matchedFamily = FONT_FAMILIES.find((f) => f.value === resolvedFont)
    ?? FONT_FAMILIES.find((f) => resolvedFont.toLowerCase().includes(f.value.split(',')[0].toLowerCase().replace(/"/g, '')))
  const displayLabel = matchedFamily?.label
    ?? (resolvedFont ? resolvedFont.split(',')[0].replace(/"/g, '').trim() : DEFAULT_FONT.label)
  const displayFontValue = matchedFamily?.value ?? DEFAULT_FONT.value

  const select = (value: string) => {
    editor?.chain().focus().setFontFamily(value).run()
    closeDropdown()
  }

  if (!editor) return null

  return (
    <div className="relative">
      <button
        ref={triggerRef as React.RefObject<HTMLButtonElement>}
        className="inline-flex items-center justify-between w-[122px] h-7 px-2 rounded border border-gray-300 bg-white text-sm text-gray-800 hover:border-blue-400 focus:outline-none transition-colors"
        onClick={toggleDropdown}
        title="字体"
        type="button"
      >
        <span className="truncate" style={{ fontFamily: displayFontValue }}>
          {displayLabel}
        </span>
        <ChevronDown size={11} className="ml-1 flex-shrink-0 text-gray-400" />
      </button>

      {open && ReactDOM.createPortal(
        <div
          ref={dropdownRef as React.RefObject<HTMLDivElement>}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, color: '#111827' }}
          className="w-44 bg-white border border-gray-200 shadow-xl rounded py-1 max-h-64 overflow-y-auto"
        >
          {FONT_FAMILIES.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                currentFont === f.value ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
              }`}
              style={{ fontFamily: f.value }}
              onClick={() => select(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

export default FontSelector
