import React, { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { PaintBucket, ChevronDown } from 'lucide-react'

interface BorderShadingPanelProps {
  editor: Editor
}

const SHADING_COLORS = [
  '#ffffff', '#f5f5f5', '#e8e8e8', '#d0d0d0', '#b0b0b0',
  '#fef9c3', '#fef3c7', '#fde68a', '#fcd34d', '#f59e0b',
  '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#16a34a',
  '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#2563eb',
]

const BorderShadingPanel: React.FC<BorderShadingPanelProps> = ({ editor }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="inline-flex items-center justify-center w-8 h-7 rounded text-gray-600 hover:bg-gray-200 transition-colors"
        title="段落底纹"
        onClick={() => setOpen(v => !v)}
      >
        <PaintBucket size={14} />
        <ChevronDown size={9} className="ml-0.5" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-0.5 bg-white border border-gray-200 shadow-xl rounded-lg p-3 z-50 w-52">
          <p className="text-[11px] text-gray-400 mb-1.5 font-medium uppercase tracking-wide">段落底纹颜色</p>
          <div className="grid grid-cols-5 gap-1 mb-2">
            {SHADING_COLORS.map(c => (
              <button
                key={c}
                type="button"
                className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
                title={c}
                onClick={() => {
                  editor.chain().focus().setParagraphBg(c).run()
                  setOpen(false)
                }}
              />
            ))}
          </div>
          <button
            type="button"
            className="w-full text-center px-2 py-1 text-xs text-gray-500 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            onClick={() => {
              editor.chain().focus().unsetParagraphBg().run()
              setOpen(false)
            }}
          >
            无 (清除)
          </button>
        </div>
      )}
    </div>
  )
}

export default BorderShadingPanel
