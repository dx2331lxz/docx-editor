import React from 'react'
import ReactDOM from 'react-dom'
import type { Editor } from '@tiptap/react'
import {
  ArrowUpFromLine,
  ArrowDownFromLine,
  ArrowLeftFromLine,
  ArrowRightFromLine,
  Trash2,
  Merge,
  SplitSquareVertical,
  ChevronDown,
} from 'lucide-react'
import { useDropdownPortal } from '../../hooks/useDropdownPortal'

interface TableToolbarProps {
  editor: Editor | null
}

const tbtn =
  'inline-flex items-center gap-1 h-6 px-2 text-xs rounded bg-white border border-blue-200 hover:bg-blue-100 text-blue-700 transition-colors flex-shrink-0'

const TDivider = () => (
  <div className="w-px h-4 bg-blue-200 mx-1 self-center flex-shrink-0" />
)

// ── Table style presets ────────────────────────────────────────────────────────
const TABLE_STYLES = [
  {
    id: 'simple',
    name: '简单线框',
    css: `border: 1px solid #374151; border-collapse: collapse;`,
    cellCss: `border: 1px solid #374151; padding: 4px 8px;`,
    headerCss: `border: 1px solid #374151; padding: 4px 8px; background: #f9fafb;`,
  },
  {
    id: 'light-grid',
    name: '浅色网格',
    css: `border-collapse: collapse;`,
    cellCss: `border: 1px solid #e5e7eb; padding: 4px 8px;`,
    headerCss: `border: 1px solid #e5e7eb; padding: 4px 8px; background: #f3f4f6;`,
  },
  {
    id: 'dark-header',
    name: '深色标题行',
    css: `border-collapse: collapse; width: 100%;`,
    cellCss: `border: 1px solid #d1d5db; padding: 4px 8px;`,
    headerCss: `border: 1px solid #374151; padding: 4px 8px; background: #374151; color: white; font-weight: bold;`,
  },
  {
    id: 'blue-header',
    name: '蓝色表头',
    css: `border-collapse: collapse; width: 100%;`,
    cellCss: `border: 1px solid #bfdbfe; padding: 4px 8px;`,
    headerCss: `border: 1px solid #3b82f6; padding: 4px 8px; background: #3b82f6; color: white; font-weight: bold;`,
  },
  {
    id: 'striped',
    name: '交替行底色',
    css: `border-collapse: collapse; width: 100%;`,
    cellCss: `border: 1px solid #e5e7eb; padding: 4px 8px;`,
    headerCss: `border: 1px solid #d1d5db; padding: 4px 8px; background: #eff6ff; font-weight: bold;`,
  },
  {
    id: 'no-border',
    name: '无边框',
    css: `border-collapse: collapse; width: 100%;`,
    cellCss: `border: none; padding: 4px 8px; border-bottom: 1px solid #f3f4f6;`,
    headerCss: `border: none; padding: 4px 8px; border-bottom: 2px solid #6b7280; font-weight: bold;`,
  },
]

/** Apply a style preset to the table at current cursor position */
function applyTableStyle(editor: Editor, styleId: string) {
  const style = TABLE_STYLES.find((s) => s.id === styleId)
  if (!style) return
  // Find the table DOM node and apply classes/styles directly
  const { state } = editor
  const { selection } = state
  // Walk up to find table node
  let depth = selection.$from.depth
  while (depth > 0) {
    const node = selection.$from.node(depth)
    if (node.type.name === 'table') {
      // We store the style ID as a data attribute via editor commands
      // Use updateAttributes (TipTap built-in) to set class
      editor.chain().focus().updateAttributes('table', {
        class: `table-style-${styleId}`,
      }).run()
      return
    }
    depth--
  }
}

// ── Table Style Dropdown ───────────────────────────────────────────────────────
const TableStyleDropdown: React.FC<{ editor: Editor }> = ({ editor }) => {
  const { triggerRef, dropdownRef, open, pos, toggleDropdown, closeDropdown } = useDropdownPortal()

  return (
    <div className="relative">
      <button
        ref={triggerRef as React.RefObject<HTMLButtonElement>}
        type="button"
        className={`${tbtn} gap-1`}
        title="表格样式"
        onClick={toggleDropdown}
      >
        表格样式 <ChevronDown size={10} />
      </button>
      {open && ReactDOM.createPortal(
        <div
          ref={dropdownRef as React.RefObject<HTMLDivElement>}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="bg-white border border-gray-200 shadow-xl rounded py-1 w-36"
        >
          {TABLE_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              onClick={() => {
                applyTableStyle(editor, s.id)
                closeDropdown()
              }}
            >
              {s.name}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

const TableToolbar: React.FC<TableToolbarProps> = ({ editor }) => {
  if (!editor || !editor.isActive('table')) return null

  return (
    <div className="flex flex-wrap items-center gap-1 px-3 py-1 bg-blue-50 border-b border-blue-200 select-none">
      <span className="text-xs text-blue-500 font-medium mr-1">表格:</span>

      <button
        type="button"
        className={tbtn}
        title="在上方插入行"
        onClick={() => editor.chain().focus().addRowBefore().run()}
      >
        <ArrowUpFromLine size={12} /> 行↑
      </button>
      <button
        type="button"
        className={tbtn}
        title="在下方插入行"
        onClick={() => editor.chain().focus().addRowAfter().run()}
      >
        <ArrowDownFromLine size={12} /> 行↓
      </button>

      <TDivider />

      <button
        type="button"
        className={tbtn}
        title="在左侧插入列"
        onClick={() => editor.chain().focus().addColumnBefore().run()}
      >
        <ArrowLeftFromLine size={12} /> 列←
      </button>
      <button
        type="button"
        className={tbtn}
        title="在右侧插入列"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
      >
        <ArrowRightFromLine size={12} /> 列→
      </button>

      <TDivider />

      <button
        type="button"
        className={tbtn}
        title="删除行"
        onClick={() => editor.chain().focus().deleteRow().run()}
      >
        <Trash2 size={12} /> 删行
      </button>
      <button
        type="button"
        className={tbtn}
        title="删除列"
        onClick={() => editor.chain().focus().deleteColumn().run()}
      >
        <Trash2 size={12} /> 删列
      </button>
      <button
        type="button"
        className={`${tbtn} border-red-200 text-red-600 hover:bg-red-50`}
        title="删除表格"
        onClick={() => editor.chain().focus().deleteTable().run()}
      >
        <Trash2 size={12} /> 删表
      </button>

      <TDivider />

      <button
        type="button"
        className={tbtn}
        title="合并单元格"
        onClick={() => editor.chain().focus().mergeCells().run()}
      >
        <Merge size={12} /> 合并
      </button>
      <button
        type="button"
        className={tbtn}
        title="拆分单元格"
        onClick={() => editor.chain().focus().splitCell().run()}
      >
        <SplitSquareVertical size={12} /> 拆分
      </button>

      <TDivider />

      <TableStyleDropdown editor={editor} />
    </div>
  )
}

export default TableToolbar
