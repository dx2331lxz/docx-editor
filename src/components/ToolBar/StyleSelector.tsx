import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import { useDropdownPortal } from '../../hooks/useDropdownPortal'

interface StyleSelectorProps {
  editor: Editor | null
  onOpenStyleManager?: () => void
}

interface StyleDef {
  label: string
  description: string
  previewStyle: React.CSSProperties
  isActive: (editor: Editor) => boolean
  apply: (editor: Editor) => void
}

const STYLES: StyleDef[] = [
  {
    label: '正文',
    description: '正文',
    previewStyle: { fontSize: '13px', fontWeight: 400, color: '#333' },
    isActive: (ed) => !ed.isActive('heading'),
    apply: (ed) => ed.chain().focus().setParagraph().run(),
  },
  {
    label: '标题 1',
    description: 'H1',
    previewStyle: { fontSize: '16px', fontWeight: 700, color: '#1a1a1a' },
    isActive: (ed) => ed.isActive('heading', { level: 1 }),
    apply: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    label: '标题 2',
    description: 'H2',
    previewStyle: { fontSize: '14px', fontWeight: 700, color: '#1a1a1a' },
    isActive: (ed) => ed.isActive('heading', { level: 2 }),
    apply: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: '标题 3',
    description: 'H3',
    previewStyle: { fontSize: '13px', fontWeight: 600, color: '#374151' },
    isActive: (ed) => ed.isActive('heading', { level: 3 }),
    apply: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    label: '标题 4',
    description: 'H4',
    previewStyle: { fontSize: '12px', fontWeight: 600, color: '#6b7280' },
    isActive: (ed) => ed.isActive('heading', { level: 4 }),
    apply: (ed) => ed.chain().focus().toggleHeading({ level: 4 }).run(),
  },
  {
    label: '副标题',
    description: '副标题',
    previewStyle: { fontSize: '13px', fontWeight: 400, fontStyle: 'italic', color: '#6b7280' },
    isActive: (ed) => ed.isActive('heading', { level: 5 }),
    apply: (ed) => ed.chain().focus().toggleHeading({ level: 5 }).run(),
  },
]

const StyleSelector: React.FC<StyleSelectorProps> = ({ editor, onOpenStyleManager }) => {
  const { triggerRef, dropdownRef, open, pos, toggleDropdown, closeDropdown } = useDropdownPortal()
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  // React to selection changes
  const activeHeadingLevel = useEditorState({
    editor,
    selector: (ctx) => {
      const ed = ctx.editor
      if (!ed) return -1
      for (let i = 1; i <= 6; i++) {
        if (ed.isActive('heading', { level: i })) return i
      }
      return 0 // paragraph
    },
  })

  // Close on outside click
  // (handled by useDropdownPortal)

  // Toast auto-clear
  useEffect(() => {
    if (!toastMsg) return
    const t = setTimeout(() => setToastMsg(null), 1500)
    return () => clearTimeout(t)
  }, [toastMsg])

  if (!editor) return null

  const currentStyleLabel = (() => {
    if (activeHeadingLevel === 0) return '正文'
    const found = STYLES.find((s) => {
      if (s.label === '标题 1') return activeHeadingLevel === 1
      if (s.label === '标题 2') return activeHeadingLevel === 2
      if (s.label === '标题 3') return activeHeadingLevel === 3
      if (s.label === '标题 4') return activeHeadingLevel === 4
      if (s.label === '副标题') return activeHeadingLevel === 5
      return false
    })
    return found?.label ?? '正文'
  })()

  const applyStyle = (style: StyleDef) => {
    style.apply(editor)
    setToastMsg(`已应用：${style.label}`)
    closeDropdown()
  }

  return (
    <div className="relative flex items-center gap-1 px-3 py-1.5 bg-white border-b border-gray-200 flex-wrap">
      {/* Current style button */}
      <button
        ref={triggerRef as React.RefObject<HTMLButtonElement>}
        type="button"
        onClick={toggleDropdown}
        className="inline-flex items-center gap-1 px-3 h-7 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm flex-shrink-0"
        title="样式列表"
      >
        <span>{currentStyleLabel}</span>
        <span className="text-gray-400 text-xs">▾</span>
      </button>

      {/* Dropdown */}
      {open && ReactDOM.createPortal(
        <div
          ref={dropdownRef as React.RefObject<HTMLDivElement>}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded shadow-lg p-2 w-[320px]"
        >
          {/* 2-column grid */}
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            {STYLES.map((style) => {
              const active = (() => {
                if (style.label === '正文') return activeHeadingLevel === 0
                if (style.label === '标题 1') return activeHeadingLevel === 1
                if (style.label === '标题 2') return activeHeadingLevel === 2
                if (style.label === '标题 3') return activeHeadingLevel === 3
                if (style.label === '标题 4') return activeHeadingLevel === 4
                if (style.label === '副标题') return activeHeadingLevel === 5
                return false
              })()

              return (
                <button
                  key={style.label}
                  type="button"
                  onClick={() => applyStyle(style)}
                  className={`
                    flex flex-col items-start px-3 py-2 rounded border transition-all text-left
                    ${active
                      ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-300'
                      : 'bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                    }
                  `}
                  title={style.description}
                >
                  <span style={style.previewStyle} className="leading-tight">AaBbCc</span>
                  <span className="text-xs text-gray-500 mt-0.5">{style.label}</span>
                </button>
              )
            })}
          </div>

          {/* New style button */}
          <div className="border-t border-gray-100 pt-2">
            <button
              type="button"
              className="w-full text-sm text-blue-600 hover:bg-blue-50 py-1 rounded text-left px-2"
              onClick={() => { closeDropdown(); onOpenStyleManager?.() }}
            >
              ＋ 新建样式…
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] bg-gray-800 text-white text-sm px-4 py-2 rounded shadow-lg pointer-events-none">
          {toastMsg}
        </div>
      )}
    </div>
  )
}

export default StyleSelector
