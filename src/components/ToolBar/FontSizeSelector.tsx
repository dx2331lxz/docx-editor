import React, { useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import { ChevronDown, AArrowUp, AArrowDown } from 'lucide-react'
import { useDropdownPortal } from '../../hooks/useDropdownPortal'

interface FontSizeSelectorProps {
  editor: Editor | null
}

const PRESET_SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 42, 48, 54, 60, 72]
const DEFAULT_SIZE = 12

const FontSizeSelector: React.FC<FontSizeSelectorProps> = ({ editor }) => {
  const { triggerRef, dropdownRef, open, pos, openDropdown, closeDropdown } = useDropdownPortal()
  const [inputValue, setInputValue] = React.useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Reactively read font size from editor on every cursor move / selection change
  const currentSizeRaw = useEditorState({
    editor,
    selector: (ctx) =>
      (ctx.editor?.getAttributes('textStyle')?.fontSize as string | undefined) ?? '',
  })

  const parsedSize = currentSizeRaw ? parseFloat(currentSizeRaw.replace('px', '')) : NaN
  // When no explicit size is set, fall back to DEFAULT_SIZE
  const displaySize = isNaN(parsedSize) ? DEFAULT_SIZE : parsedSize

  // Keep input in sync when not actively editing
  useEffect(() => {
    if (!open) setInputValue(String(displaySize))
  }, [displaySize, open])

  const applySize = (size: number) => {
    if (!isNaN(size) && size > 0 && size <= 1000 && editor) {
      editor.chain().focus().setFontSize(`${size}px`).run()
    }
  }

  const selectPreset = (size: number) => {
    applySize(size)
    closeDropdown()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = parseFloat(inputValue)
      applySize(val)
      closeDropdown()
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      closeDropdown()
      setInputValue(String(displaySize))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      stepSize(1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      stepSize(-1)
    }
  }

  const stepSize = (direction: 1 | -1) => {
    const idx = PRESET_SIZES.findIndex((s) => s >= displaySize)
    if (direction === 1) {
      const next = PRESET_SIZES[Math.min(idx + 1, PRESET_SIZES.length - 1)]
      applySize(next ?? PRESET_SIZES[PRESET_SIZES.length - 1])
    } else {
      const prev = PRESET_SIZES[Math.max((idx <= 0 ? 1 : idx) - 1, 0)]
      applySize(prev ?? PRESET_SIZES[0])
    }
  }

  if (!editor) return null

  return (
    <div className="relative flex items-center gap-0.5">
      {/* Size input — flex wrapper makes chevron always visible */}
      <button
        ref={triggerRef as React.RefObject<HTMLButtonElement>}
        type="button"
        className="inline-flex items-center justify-between w-[70px] h-7 px-2 rounded border border-gray-300 bg-white hover:border-blue-400 transition-colors cursor-pointer gap-0.5"
        onClick={() => {
          setInputValue(String(displaySize))
          if (open) closeDropdown()
          else openDropdown()
        }}
        title="字号（点击展开预设列表）"
      >
        <input
          ref={inputRef}
          type="text"
          className="w-full bg-transparent text-sm text-center text-gray-800 focus:outline-none min-w-0"
          value={open ? inputValue : String(displaySize)}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => {
            setInputValue(String(displaySize))
            openDropdown()
          }}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          title="字号（输入后回车确认）"
        />
        <ChevronDown size={11} className="flex-shrink-0 text-gray-400" />
      </button>

      {/* Preset dropdown */}
      {open && ReactDOM.createPortal(
        <div
          ref={dropdownRef as React.RefObject<HTMLDivElement>}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="w-[70px] bg-white border border-gray-200 shadow-xl rounded py-1 max-h-52 overflow-y-auto"
        >
          {PRESET_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              className={`w-full text-center px-1 py-0.5 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                displaySize === s ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
              }`}
              onMouseDown={(e) => {
                e.preventDefault()
                selectPreset(s)
              }}
            >
              {s}
            </button>
          ))}
        </div>,
        document.body
      )}

      {/* A↑ / A↓ step buttons using lucide icons */}
      <button
        type="button"
        className="inline-flex items-center justify-center w-7 h-7 rounded text-gray-600 hover:bg-gray-200 transition-colors"
        title="增大字号"
        onClick={() => stepSize(1)}
      >
        <AArrowUp size={15} />
      </button>
      <button
        type="button"
        className="inline-flex items-center justify-center w-7 h-7 rounded text-gray-600 hover:bg-gray-200 transition-colors"
        title="减小字号"
        onClick={() => stepSize(-1)}
      >
        <AArrowDown size={15} />
      </button>
    </div>
  )
}

export default FontSizeSelector
