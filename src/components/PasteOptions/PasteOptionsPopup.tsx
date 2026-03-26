import React, { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'

interface PasteOptionsPopupProps {
  editor: Editor | null
}

interface PopupState {
  visible: boolean
  x: number
  y: number
}

const PasteOptionsPopup: React.FC<PasteOptionsPopupProps> = ({ editor }) => {
  const [popup, setPopup] = useState<PopupState>({ visible: false, x: 0, y: 0 })
  const [expanded, setExpanded] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)
  const pasteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!editor) return
    const dom = editor.view.dom as HTMLElement

    const handlePaste = () => {
      if (pasteTimerRef.current) clearTimeout(pasteTimerRef.current)
      pasteTimerRef.current = setTimeout(() => {
        const { state, view } = editor
        const { selection } = state
        const coords = view.coordsAtPos(selection.from)
        setPopup({ visible: true, x: coords.left, y: coords.bottom + 6 })
        setExpanded(false)
      }, 50)
    }

    dom.addEventListener('paste', handlePaste)
    return () => {
      dom.removeEventListener('paste', handlePaste)
      if (pasteTimerRef.current) clearTimeout(pasteTimerRef.current)
    }
  }, [editor])

  // Ctrl+Shift+V: paste as plain text
  useEffect(() => {
    if (!editor) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        e.preventDefault()
        pasteAsPlainText()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editor]) // eslint-disable-line react-hooks/exhaustive-deps

  // Dismiss on outside click or Escape
  useEffect(() => {
    if (!popup.visible) return
    const handleMouseDown = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopup((p) => ({ ...p, visible: false }))
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopup((p) => ({ ...p, visible: false }))
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [popup.visible])

  const pasteAsPlainText = () => {
    if (!editor) return
    // Get clipboard text and insert as plain text
    navigator.clipboard.readText().then((text) => {
      if (text) {
        editor.chain().focus().insertContent(text).run()
      }
    }).catch(() => {
      // fallback: clear marks from current selection
      editor.chain().focus().unsetAllMarks().clearNodes().run()
    })
    setPopup((p) => ({ ...p, visible: false }))
  }

  const matchTargetFormat = () => {
    if (!editor) return
    // Keep paragraph structure but remove inline marks from selection
    editor.chain().focus().unsetAllMarks().run()
    setPopup((p) => ({ ...p, visible: false }))
  }

  const keepSourceFormat = () => {
    // Already pasted with source format — just dismiss
    setPopup((p) => ({ ...p, visible: false }))
  }

  if (!popup.visible) return null

  return (
    <div
      ref={popupRef}
      style={{ position: 'fixed', left: popup.x, top: popup.y, zIndex: 9998 }}
      className="flex items-center"
    >
      {!expanded ? (
        <button
          type="button"
          className="w-7 h-7 bg-white border border-gray-300 rounded shadow-sm hover:bg-blue-50 flex items-center justify-center text-base"
          title="粘贴选项"
          onClick={() => setExpanded(true)}
        >
          📋
        </button>
      ) : (
        <div className="flex items-center gap-1 bg-white border border-gray-300 rounded shadow-md px-2 py-1">
          <button
            type="button"
            className="px-2 py-1 text-xs rounded hover:bg-blue-50 text-gray-700 whitespace-nowrap"
            onClick={keepSourceFormat}
            title="保留源格式"
          >
            保留源格式
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <button
            type="button"
            className="px-2 py-1 text-xs rounded hover:bg-blue-50 text-gray-700 whitespace-nowrap"
            onClick={pasteAsPlainText}
            title="仅保留文字"
          >
            仅保留文字
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <button
            type="button"
            className="px-2 py-1 text-xs rounded hover:bg-blue-50 text-gray-700 whitespace-nowrap"
            onClick={matchTargetFormat}
            title="匹配目标格式"
          >
            匹配目标格式
          </button>
        </div>
      )}
    </div>
  )
}

export default PasteOptionsPopup
