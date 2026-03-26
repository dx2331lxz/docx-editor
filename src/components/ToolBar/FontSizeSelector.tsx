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
const DEFAULT_SIZE = 14  // matches .ProseMirror { font-size: 14pt } in index.css

/** Chinese traditional size names mapped to pt values */
const CHINESE_SIZES: { label: string; size: number }[] = [
  { label: '初号',  size: 42 },
  { label: '小初',  size: 36 },
  { label: '一号',  size: 26 },
  { label: '小一',  size: 24 },
  { label: '二号',  size: 22 },
  { label: '小二',  size: 18 },
  { label: '三号',  size: 16 },
  { label: '小三',  size: 15 },
  { label: '四号',  size: 14 },
  { label: '小四',  size: 12 },
  { label: '五号',  size: 10.5 },
  { label: '小五',  size: 9 },
]

/** Map pt → Chinese name for display in the numeric list */
const PT_TO_CHINESE: Record<number, string> = Object.fromEntries(
  CHINESE_SIZES.map(({ label, size }) => [size, label])
)

/** Convert any fontSize string (e.g. "16px", "12pt", "14") to pt number */
function toPt(raw: string | undefined): number | null {
  if (!raw) return null
  const val = parseFloat(raw)
  if (isNaN(val)) return null
  if (raw.endsWith('pt')) return val
  if (raw.endsWith('px')) return val / 1.3333
  // bare number — treat as pt (legacy storage)
  return val
}

/** Get pt size via DOM computedStyle fallback for unset text */
function getDomFontSizePt(editor: Editor): number | null {
  try {
    const sel = editor.view.state.selection
    const domInfo = editor.view.domAtPos(sel.from)
    let node = domInfo.node as HTMLElement | null
    if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement
    if (!node) return null
    const px = parseFloat(window.getComputedStyle(node).fontSize)
    return isNaN(px) ? null : px / 1.3333
  } catch {
    return null
  }
}

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

  // Parse stored value (may be "14pt", "16px", or legacy bare number)
  const explicitPt = toPt(currentSizeRaw)

  // When no explicit size is set, use DOM computedStyle for accurate fallback
  const displaySize = (() => {
    if (explicitPt !== null) return Math.round(explicitPt * 10) / 10
    if (editor) {
      const domPt = getDomFontSizePt(editor)
      if (domPt !== null) return Math.round(domPt * 10) / 10
    }
    return DEFAULT_SIZE
  })()

  // Keep input in sync when not actively editing
  useEffect(() => {
    if (!open) setInputValue(String(displaySize))
  }, [displaySize, open])

  const applySize = (size: number) => {
    if (!isNaN(size) && size > 0 && size <= 1000 && editor) {
      editor.chain().focus().setFontSize(`${size}pt`).run()
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
    // Find nearest preset index
    const idx = PRESET_SIZES.findIndex((s) => s >= displaySize - 0.01)
    if (direction === 1) {
      // If current is already at or past this preset, go to next
      const startIdx = PRESET_SIZES[idx] <= displaySize + 0.01 ? idx + 1 : idx
      const next = PRESET_SIZES[Math.min(startIdx, PRESET_SIZES.length - 1)]
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
          className="w-[110px] bg-white border border-gray-200 shadow-xl rounded py-1 max-h-64 overflow-y-auto"
        >
          {/* Numeric preset sizes — show Chinese name where applicable */}
          {PRESET_SIZES.map((s) => {
            const chName = PT_TO_CHINESE[s]
            const isActive = Math.abs(displaySize - s) < 0.1
            return (
              <button
                key={s}
                type="button"
                className={`w-full flex items-center justify-between px-2 py-0.5 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                  isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
                }`}
                onMouseDown={(e) => { e.preventDefault(); selectPreset(s) }}
              >
                <span>{s}</span>
                {chName && <span className="text-xs text-gray-400 ml-1">{chName}</span>}
              </button>
            )
          })}

          {/* Divider + Chinese traditional sizes section */}
          <div className="border-t border-gray-200 mx-1 my-1" />
          <div className="px-2 py-0.5 text-xs text-gray-400 font-medium">中文字号</div>
          {CHINESE_SIZES.map(({ label, size }) => {
            const isActive = Math.abs(displaySize - size) < 0.1
            return (
              <button
                key={label}
                type="button"
                className={`w-full flex items-center justify-between px-2 py-0.5 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                  isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
                }`}
                onMouseDown={(e) => { e.preventDefault(); selectPreset(size) }}
              >
                <span>{label}</span>
                <span className="text-xs text-gray-400">{size}pt</span>
              </button>
            )
          })}
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
