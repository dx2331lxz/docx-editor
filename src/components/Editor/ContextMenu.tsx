import React, { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Scissors,
  Copy,
  Clipboard,
  Bold,
  Italic,
  Underline,
  RemoveFormatting,
  ArrowUpFromLine,
  ArrowDownFromLine,
  Trash2,
  MessageSquare,
  Languages,
} from 'lucide-react'

interface ContextMenuProps {
  editor: Editor | null
  onInsertComment?: () => void
  onTranslate?: () => void
}

interface MenuPosition {
  x: number
  y: number
}

const ContextMenu: React.FC<ContextMenuProps> = ({ editor, onInsertComment, onTranslate }) => {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState<MenuPosition>({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!editor) return
    const dom = editor.view.dom as HTMLElement

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      setPos({ x: e.clientX, y: e.clientY })
      setVisible(true)
    }

    dom.addEventListener('contextmenu', handleContextMenu)
    return () => dom.removeEventListener('contextmenu', handleContextMenu)
  }, [editor])

  useEffect(() => {
    if (!visible) return

    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setVisible(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVisible(false)
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [visible])

  if (!editor || !visible) return null

  const close = () => setVisible(false)

  const run = (fn: () => void) => {
    fn()
    close()
  }

  const inTable = editor.isActive('table')

  const itemCls =
    'flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 cursor-pointer'
  const disabledCls =
    'flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 cursor-not-allowed'
  const activeCls =
    'flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 cursor-pointer font-semibold text-blue-600'

  // Clamp position so menu doesn't overflow viewport
  const menuW = 180
  const menuH = 320
  const x = Math.min(pos.x, window.innerWidth - menuW - 8)
  const y = Math.min(pos.y, window.innerHeight - menuH - 8)

  return (
    <div
      ref={menuRef}
      style={{ position: 'fixed', left: x, top: y, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded shadow-lg min-w-[160px] py-1"
    >
      {/* Clipboard */}
      <div
        className={itemCls}
        onClick={() => run(() => document.execCommand('cut'))}
      >
        <Scissors size={14} /> 剪切
      </div>
      <div
        className={itemCls}
        onClick={() => run(() => document.execCommand('copy'))}
      >
        <Copy size={14} /> 复制
      </div>
      <div className={disabledCls} title="浏览器安全限制，无法程序化粘贴">
        <Clipboard size={14} /> 粘贴
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-1 mx-2" />

      {/* Format */}
      <div
        className={editor.isActive('bold') ? activeCls : itemCls}
        onClick={() => run(() => editor.chain().focus().toggleBold().run())}
      >
        <Bold size={14} /> 加粗
      </div>
      <div
        className={editor.isActive('italic') ? activeCls : itemCls}
        onClick={() => run(() => editor.chain().focus().toggleItalic().run())}
      >
        <Italic size={14} /> 斜体
      </div>
      <div
        className={editor.isActive('underline') ? activeCls : itemCls}
        onClick={() => run(() => editor.chain().focus().toggleUnderline().run())}
      >
        <Underline size={14} /> 下划线
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-1 mx-2" />

      <div
        className={itemCls}
        onClick={() =>
          run(() => editor.chain().focus().unsetAllMarks().clearNodes().run())
        }
      >
        <RemoveFormatting size={14} /> 清除格式
      </div>

      {/* Comment */}
      <div className="border-t border-gray-200 my-1 mx-2" />
      <div
        className={itemCls}
        onClick={() => { setVisible(false); onInsertComment?.() }}
      >
        <MessageSquare size={14} /> 插入批注
      </div>
      <div
        className={itemCls}
        onClick={() => { setVisible(false); onTranslate?.() }}
      >
        <Languages size={14} /> 翻译选中文字
      </div>

      {/* Table section — only when inside a table */}
      {inTable && (
        <>
          <div className="border-t border-gray-200 my-1 mx-2" />
          <div
            className={itemCls}
            onClick={() => run(() => editor.chain().focus().addRowBefore().run())}
          >
            <ArrowUpFromLine size={14} /> 插入行 (上方)
          </div>
          <div
            className={itemCls}
            onClick={() => run(() => editor.chain().focus().addRowAfter().run())}
          >
            <ArrowDownFromLine size={14} /> 插入行 (下方)
          </div>
          <div
            className={itemCls}
            onClick={() => run(() => editor.chain().focus().deleteRow().run())}
          >
            <Trash2 size={14} /> 删除行
          </div>
          <div
            className={itemCls}
            onClick={() => run(() => editor.chain().focus().deleteTable().run())}
          >
            <Trash2 size={14} className="text-red-500" /> 删除表格
          </div>
        </>
      )}
    </div>
  )
}

export default ContextMenu
