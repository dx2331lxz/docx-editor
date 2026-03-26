import React, { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import { ChevronDown } from 'lucide-react'

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
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Reactively read font from editor state on every selection/transaction update
  const currentFont = useEditorState({
    editor,
    selector: (ctx) =>
      (ctx.editor?.getAttributes('textStyle')?.fontFamily as string | undefined) ?? '',
  })

  const matchedFamily = FONT_FAMILIES.find((f) => f.value === currentFont)
  const displayLabel = matchedFamily?.label
    ?? (currentFont ? currentFont.split(',')[0].replace(/"/g, '').trim() : DEFAULT_FONT.label)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (value: string) => {
    editor?.chain().focus().setFontFamily(value).run()
    setOpen(false)
  }

  if (!editor) return null

  return (
    <div ref={ref} className="relative">
      <button
        className="inline-flex items-center justify-between w-[122px] h-7 px-2 rounded border border-gray-300 bg-white text-sm text-gray-800 hover:border-blue-400 focus:outline-none transition-colors"
        onClick={() => setOpen((v) => !v)}
        title="字体"
        type="button"
      >
        <span className="truncate" style={{ fontFamily: matchedFamily?.value ?? DEFAULT_FONT.value }}>
          {displayLabel}
        </span>
        <ChevronDown size={11} className="ml-1 flex-shrink-0 text-gray-400" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-0.5 w-44 bg-white border border-gray-200 shadow-xl rounded z-50 py-1 max-h-64 overflow-y-auto">
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
        </div>
      )}
    </div>
  )
}

export default FontSelector
