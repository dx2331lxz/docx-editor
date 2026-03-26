import React, { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { ChevronDown } from 'lucide-react'

interface LetterSpacingDropdownProps {
  editor: Editor
}

const SPACINGS = [
  { label: '标准 (0)', value: '0' },
  { label: '加宽 +1px', value: '1' },
  { label: '加宽 +2px', value: '2' },
  { label: '加宽 +4px', value: '4' },
  { label: '紧缩 -1px', value: '-1' },
  { label: '紧缩 -2px', value: '-2' },
]

const LetterSpacingDropdown: React.FC<LetterSpacingDropdownProps> = ({ editor }) => {
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
        className="inline-flex items-center gap-0.5 h-7 px-1.5 rounded text-xs text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0"
        title="字符间距"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-[11px]">字间距</span>
        <ChevronDown size={9} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-0.5 bg-white border border-gray-200 shadow-xl rounded z-50 py-1 w-36">
          {SPACINGS.map(s => (
            <button
              key={s.value}
              type="button"
              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              onClick={() => {
                if (s.value === '0') editor.chain().focus().unsetLetterSpacing().run()
                else editor.chain().focus().setLetterSpacing(s.value).run()
                setOpen(false)
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LetterSpacingDropdown
