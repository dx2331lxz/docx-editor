import React from 'react'
import ReactDOM from 'react-dom'
import type { Editor } from '@tiptap/react'
import { ChevronDown } from 'lucide-react'
import { useDropdownPortal } from '../../hooks/useDropdownPortal'

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
  const { triggerRef, dropdownRef, open, pos, toggleDropdown, closeDropdown } = useDropdownPortal()

  return (
    <div className="relative">
      <button
        ref={triggerRef as React.RefObject<HTMLButtonElement>}
        type="button"
        className="inline-flex items-center gap-0.5 h-7 px-1.5 rounded text-xs text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0"
        title="字符间距"
        onClick={toggleDropdown}
      >
        <span className="text-[11px]">字间距</span>
        <ChevronDown size={9} />
      </button>
      {open && ReactDOM.createPortal(
        <div
          ref={dropdownRef as React.RefObject<HTMLDivElement>}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="bg-white border border-gray-200 shadow-xl rounded py-1 w-36"
        >
          {SPACINGS.map(s => (
            <button
              key={s.value}
              type="button"
              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              onClick={() => {
                if (s.value === '0') editor.chain().focus().unsetLetterSpacing().run()
                else editor.chain().focus().setLetterSpacing(s.value).run()
                closeDropdown()
              }}
            >
              {s.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

export default LetterSpacingDropdown
