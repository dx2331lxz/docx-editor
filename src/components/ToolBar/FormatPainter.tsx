import React, { useState, useEffect, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { Paintbrush } from 'lucide-react'

interface CapturedMarks {
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  fontFamily: string | null
  fontSize: string | null
  color: string | null
  highlight: string | null
}

interface FormatPainterProps {
  editor: Editor
}

const FormatPainter: React.FC<FormatPainterProps> = ({ editor }) => {
  const [painterMode, setPainterMode] = useState<'off' | 'once' | 'persistent'>('off')
  const [capturedMarks, setCapturedMarks] = useState<CapturedMarks | null>(null)
  const [lastClickTime, setLastClickTime] = useState<number>(0)

  const captureMarks = useCallback((): CapturedMarks => {
    const textStyle = editor.getAttributes('textStyle') as Record<string, string | undefined>
    const highlight = editor.getAttributes('highlight') as Record<string, string | undefined>
    return {
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      strike: editor.isActive('strike'),
      fontFamily: textStyle.fontFamily ?? null,
      fontSize: textStyle.fontSize ?? null,
      color: textStyle.color ?? null,
      highlight: highlight.color ?? null,
    }
  }, [editor])

  const applyMarks = useCallback((marks: CapturedMarks) => {
    let chain = editor.chain().focus()
    if (marks.bold) chain = chain.setBold()
    else chain = chain.unsetBold()
    if (marks.italic) chain = chain.setItalic()
    else chain = chain.unsetItalic()
    if (marks.underline) chain = chain.setUnderline()
    else chain = chain.unsetUnderline()
    if (marks.strike) chain = chain.setStrike()
    else chain = chain.unsetStrike()
    if (marks.fontFamily) chain = chain.setFontFamily(marks.fontFamily)
    else chain = chain.unsetFontFamily()
    if (marks.fontSize) chain = chain.setFontSize(marks.fontSize)
    if (marks.color) chain = chain.setColor(marks.color)
    else chain = chain.unsetColor()
    if (marks.highlight) chain = chain.setHighlight({ color: marks.highlight })
    else chain = chain.unsetHighlight()
    chain.run()
  }, [editor])

  useEffect(() => {
    if (painterMode === 'off' || !capturedMarks) return
    const handleMouseUp = () => {
      const { from, to } = editor.state.selection
      if (from !== to) {
        applyMarks(capturedMarks)
        if (painterMode === 'once') {
          setPainterMode('off')
          setCapturedMarks(null)
        }
      }
    }
    const editorDom = editor.view.dom
    editorDom.addEventListener('mouseup', handleMouseUp)
    return () => editorDom.removeEventListener('mouseup', handleMouseUp)
  }, [painterMode, capturedMarks, editor, applyMarks])

  useEffect(() => {
    if (painterMode === 'off') return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPainterMode('off')
        setCapturedMarks(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [painterMode])

  const handleClick = () => {
    const now = Date.now()
    if (now - lastClickTime < 300) {
      // double click
      setPainterMode('persistent')
      setCapturedMarks(captureMarks())
    } else {
      if (painterMode !== 'off') {
        setPainterMode('off')
        setCapturedMarks(null)
      } else {
        setPainterMode('once')
        setCapturedMarks(captureMarks())
      }
    }
    setLastClickTime(now)
  }

  const bgClass =
    painterMode === 'persistent'
      ? 'bg-orange-200 text-orange-700'
      : painterMode === 'once'
      ? 'bg-yellow-100 text-yellow-700'
      : 'text-gray-600 hover:bg-gray-200'

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center w-7 h-7 rounded transition-colors flex-shrink-0 ${bgClass}`}
      title={painterMode === 'off' ? '格式刷 (单击一次，双击持续)' : '格式刷激活 (按 Esc 退出)'}
      onClick={handleClick}
      style={{ cursor: painterMode !== 'off' ? 'crosshair' : 'pointer' }}
    >
      <Paintbrush size={14} />
    </button>
  )
}

export default FormatPainter
