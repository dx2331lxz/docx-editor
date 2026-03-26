import React from 'react'
import ReactDOM from 'react-dom'
import type { Editor } from '@tiptap/react'
import { PaintBucket, ChevronDown } from 'lucide-react'
import { useDropdownPortal } from '../../hooks/useDropdownPortal'

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
  const { triggerRef, dropdownRef, open, pos, toggleDropdown, closeDropdown } = useDropdownPortal()

  return (
    <div className="relative">
      <button
        ref={triggerRef as React.RefObject<HTMLButtonElement>}
        type="button"
        className="inline-flex items-center justify-center w-8 h-7 rounded text-gray-600 hover:bg-gray-200 transition-colors"
        title="段落底纹"
        onClick={toggleDropdown}
      >
        <PaintBucket size={14} />
        <ChevronDown size={9} className="ml-0.5" />
      </button>
      {open && ReactDOM.createPortal(
        <div
          ref={dropdownRef as React.RefObject<HTMLDivElement>}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="bg-white border border-gray-200 shadow-xl rounded-lg p-3 w-52"
        >
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
                  closeDropdown()
                }}
              />
            ))}
          </div>
          <button
            type="button"
            className="w-full text-center px-2 py-1 text-xs text-gray-500 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            onClick={() => {
              editor.chain().focus().unsetParagraphBg().run()
              closeDropdown()
            }}
          >
            无 (清除)
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}

export default BorderShadingPanel
