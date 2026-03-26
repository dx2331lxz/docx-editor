import React, { useRef, useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import { useDropdownPortal } from '../../hooks/useDropdownPortal'
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered,
  Indent, Outdent,
  Undo2, Redo2,
  Table2,
  Highlighter,
  ChevronDown,
  Quote,
  Code2,
  Eraser,
  Upload, Download,
  Superscript, Subscript,
  Baseline,
  ListTree,
  Columns2,
  Columns3,
  Square,
  ScanSearch,
  Link2,
  MessageSquare,
  MoreHorizontal,
} from 'lucide-react'
import { importDocx } from '../../utils/docxHandler'
import FontSelector from './FontSelector'
import FontSizeSelector from './FontSizeSelector'
import ColorPicker from './ColorPicker'
import StyleSelector from './StyleSelector'
import TableToolbar from './TableToolbar'
import FormatPainter from './FormatPainter'
import LetterSpacingDropdown from './LetterSpacingDropdown'
import BorderShadingPanel from './BorderShadingPanel'
import type { ColumnCount } from '../Editor/EditorCanvas'

interface ToolBarProps {
  editor: Editor | null
  onExport?: () => void
  onOpenParagraphDialog?: () => void
  onOpenHeaderFooter?: (mode: 'header' | 'footer') => void
  onOpenLinkDialog?: () => void
  onToggleCommentPanel?: () => void
  showCommentPanel?: boolean
  columns?: ColumnCount
  onColumnsChange?: (n: ColumnCount) => void
  showRuler?: boolean
  onToggleRuler?: () => void
  trackingEnabled?: boolean
  onOpenStyleManager?: () => void
  onOpenVibeEditing?: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const btn = (active?: boolean) =>
  `inline-flex items-center justify-center w-7 h-7 rounded transition-colors flex-shrink-0 ${
    active ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-200'
  }`

const Divider = () => (
  <div className="w-px h-5 bg-gray-300 mx-1 self-center flex-shrink-0" />
)

// ── Column layout dropdown ─────────────────────────────────────────────────────
const COLUMN_OPTIONS: { value: ColumnCount; label: string; icon: React.ReactNode }[] = [
  { value: 1, label: '单栏', icon: <Square size={13} /> },
  { value: 2, label: '两栏', icon: <Columns2 size={13} /> },
  { value: 3, label: '三栏', icon: <Columns3 size={13} /> },
  { value: 'left', label: '偏左两栏', icon: <Columns2 size={13} /> },
  { value: 'right', label: '偏右两栏', icon: <Columns2 size={13} /> },
]

const ColumnDropdown: React.FC<{
  columns?: ColumnCount
  onColumnsChange?: (n: ColumnCount) => void
}> = ({ columns = 1, onColumnsChange }) => {
  const { triggerRef, dropdownRef, open, pos, toggleDropdown, closeDropdown } = useDropdownPortal()
  const current = COLUMN_OPTIONS.find((o) => o.value === columns) ?? COLUMN_OPTIONS[0]
  return (
    <div className="relative flex-shrink-0">
      <button
        ref={triggerRef as React.RefObject<HTMLButtonElement>}
        className={btn(columns !== 1)}
        title="分栏"
        onClick={toggleDropdown}
        style={{ width: 'auto', paddingInline: '4px', gap: '2px' }}
      >
        {current.icon}
        <ChevronDown size={10} />
      </button>
      {open && ReactDOM.createPortal(
        <div
          ref={dropdownRef as React.RefObject<HTMLDivElement>}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="bg-white border border-gray-200 shadow-lg rounded py-1 w-28"
        >
          {COLUMN_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-blue-50 ${columns === opt.value ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
              onClick={() => { onColumnsChange?.(opt.value); closeDropdown() }}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

const LINE_SPACINGS = ['1.0', '1.15', '1.5', '2.0', '2.5', '3.0']

// ── Line spacing dropdown ─────────────────────────────────────────────────────

const LineSpacingDropdown: React.FC<{ editor: Editor; onOpenParagraphDialog?: () => void }> = ({ editor, onOpenParagraphDialog }) => {
  const { triggerRef, dropdownRef, open, pos, toggleDropdown, closeDropdown } = useDropdownPortal()

  return (
    <div className="relative">
      <button
        ref={triggerRef as React.RefObject<HTMLButtonElement>}
        type="button"
        className={`${btn()} w-9`}
        title="行间距"
        onClick={toggleDropdown}
      >
        {/* Custom line-height SVG icon */}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="3" y1="5" x2="21" y2="5"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="19" x2="21" y2="19"/>
          <polyline points="8 2 5 5 8 8"/>
          <polyline points="8 22 5 19 8 16"/>
        </svg>
        <ChevronDown size={9} className="ml-0.5" />
      </button>
      {open && ReactDOM.createPortal(
        <div
          ref={dropdownRef as React.RefObject<HTMLDivElement>}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="bg-white border border-gray-200 shadow-xl rounded py-1 w-24"
        >
          {LINE_SPACINGS.map((s) => (
            <button
              key={s}
              type="button"
              className="w-full text-center px-2 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              onClick={() => {
                editor.chain().focus().setLineHeight(s).run()
                closeDropdown()
              }}
            >
              {s} 倍
            </button>
          ))}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              type="button"
              className="w-full text-center px-2 py-1.5 text-xs text-blue-600 hover:bg-blue-50 transition-colors"
              onClick={() => {
                closeDropdown()
                onOpenParagraphDialog?.()
              }}
            >
              段落设置…
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Main ToolBar ──────────────────────────────────────────────────────────────

const ToolBar: React.FC<ToolBarProps> = ({
  editor,
  onExport,
  onOpenParagraphDialog,
  onOpenHeaderFooter,
  onOpenLinkDialog,
  onToggleCommentPanel,
  showCommentPanel = false,
  columns = 1,
  onColumnsChange,
  showRuler = true,
  onToggleRuler,
  trackingEnabled = false,
  onOpenStyleManager,
  onOpenVibeEditing: _onOpenVibeEditing,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)
  const moreButtonRef = useRef<HTMLButtonElement>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [morePos, setMorePos] = useState({ top: 0, right: 0 })

  const openMore = useCallback(() => {
    if (moreButtonRef.current) {
      const rect = moreButtonRef.current.getBoundingClientRect()
      setMorePos({ top: rect.bottom + 2, right: window.innerWidth - rect.right })
    }
    setMoreOpen(true)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        moreRef.current && !moreRef.current.contains(e.target as Node) &&
        moreButtonRef.current && !moreButtonRef.current.contains(e.target as Node)
      ) setMoreOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Reactively read colors from editor state
  const { fontColor, highlightColor } = useEditorState({
    editor,
    selector: (ctx) => ({
      fontColor:
        (ctx.editor?.getAttributes('textStyle')?.color as string | undefined) ?? '#000000',
      highlightColor:
        (ctx.editor?.getAttributes('highlight')?.color as string | undefined) ?? '#FFFF00',
    }),
  }) ?? { fontColor: '#000000', highlightColor: '#FFFF00' }

  // Reactively read active states for all buttons
  const activeStates = useEditorState({
    editor,
    selector: (ctx) => {
      const ed = ctx.editor
      if (!ed) return {} as Record<string, boolean>
      return {
        bold:         ed.isActive('bold'),
        italic:       ed.isActive('italic'),
        underline:    ed.isActive('underline'),
        strike:       ed.isActive('strike'),
        superscript:  ed.isActive('superscript'),
        subscript:    ed.isActive('subscript'),
        alignLeft:    ed.isActive({ textAlign: 'left' }),
        alignCenter:  ed.isActive({ textAlign: 'center' }),
        alignRight:   ed.isActive({ textAlign: 'right' }),
        alignJustify: ed.isActive({ textAlign: 'justify' }),
        bulletList:   ed.isActive('bulletList'),
        orderedList:  ed.isActive('orderedList'),
        blockquote:   ed.isActive('blockquote'),
        codeBlock:    ed.isActive('codeBlock'),
        link:         ed.isActive('link'),
      }
    },
  }) ?? {}

  if (!editor) return null

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const html = await importDocx(file)
    editor.commands.setContent(html)
    e.target.value = ''
  }

  const closeMore = () => setMoreOpen(false)

  return (
    <div className="glass-toolbar flex flex-col bg-gray-50 border-b border-gray-300 select-none">

      {/* ── Single main row ──────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 px-3 py-1 overflow-x-auto">

        {/* 1. Undo / Redo */}
        <button className={btn()} title="撤销 (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()}><Undo2 size={14} /></button>
        <button className={btn()} title="重做 (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()}><Redo2 size={14} /></button>
        <Divider />

        {/* 2. StyleSelector */}
        <StyleSelector editor={editor} onOpenStyleManager={onOpenStyleManager} />
        <Divider />

        {/* 3. Font */}
        <FontSelector editor={editor} />
        <FontSizeSelector editor={editor} />
        <Divider />

        {/* 4. Bold / Italic / Underline */}
        <button className={btn(activeStates.bold)}      title="粗体 (Ctrl+B)"   onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={14} /></button>
        <button className={btn(activeStates.italic)}    title="斜体 (Ctrl+I)"   onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={14} /></button>
        <button className={btn(activeStates.underline)} title="下划线 (Ctrl+U)" onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline size={14} /></button>

        {/* 5. Colors */}
        <ColorPicker
          icon={<Baseline size={14} />}
          color={fontColor}
          onChange={(c) => editor.chain().focus().setColor(c).run()}
          title="字体颜色"
        />
        <ColorPicker
          icon={<Highlighter size={14} />}
          color={highlightColor}
          onChange={(c) => editor.chain().focus().setHighlight({ color: c }).run()}
          title="高亮颜色"
        />
        <Divider />

        {/* 6. Alignment */}
        <button className={btn(activeStates.alignLeft)}    title="左对齐"   onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft size={16} /></button>
        <button className={btn(activeStates.alignCenter)}  title="居中"     onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter size={16} /></button>
        <button className={btn(activeStates.alignRight)}   title="右对齐"   onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight size={16} /></button>
        <button className={btn(activeStates.alignJustify)} title="两端对齐" onClick={() => editor.chain().focus().setTextAlign('justify').run()}><AlignJustify size={16} /></button>
        <Divider />

        {/* 7. Lists */}
        <button className={btn(activeStates.bulletList)}  title="无序列表" onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={14} /></button>
        <button className={btn(activeStates.orderedList)} title="有序列表" onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={14} /></button>
        <Divider />

        {/* 8. Import / Export */}
        <button
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded text-xs font-medium bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
          title="导入 DOCX"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={12} /> 导入
        </button>
        <button
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded text-xs font-medium bg-white border border-gray-300 text-gray-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-colors flex-shrink-0"
          title="导出为 DOCX"
          onClick={onExport}
        >
          <Download size={12} /> 导出
        </button>
        <Divider />

        {/* 9. Print Preview */}
        <button className={`${btn()} gap-1`} title="预览排版效果 (Ctrl+P)" onClick={() => window.print()}>
          <ScanSearch size={14} />
          <span style={{ fontSize: 11 }}>预览</span>
        </button>

        {/* 10. Comment toggle */}
        <button className={btn(showCommentPanel)} title="批注面板" onClick={onToggleCommentPanel}>
          <MessageSquare size={14} />
        </button>

        {/* Track changes indicator */}
        {trackingEnabled && (
          <span
            className="tracking-active inline-flex items-center gap-1 px-2 h-7 rounded text-xs bg-green-100 text-green-700 border border-green-300 font-medium flex-shrink-0"
            title="修订追踪已开启（审阅→关闭修订追踪）"
          >
            ✎ 修订中
          </span>
        )}

        <Divider />

        {/* 11. More (···) dropdown */}
        <div className="relative flex-shrink-0">
          <button
            ref={moreButtonRef}
            className={btn(moreOpen)}
            title="更多工具"
            onClick={() => moreOpen ? setMoreOpen(false) : openMore()}
          >
            <MoreHorizontal size={14} />
          </button>

          {moreOpen && ReactDOM.createPortal(
            <div
              ref={moreRef}
              style={{
                position: 'fixed',
                top: morePos.top,
                right: morePos.right,
                zIndex: 9999,
                background: '#fff',
                border: '1px solid #e5e7eb',
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                borderRadius: 6,
                minWidth: 200,
                paddingTop: 4,
                paddingBottom: 4,
              }}
            >

              {/* Strikethrough / Superscript / Subscript */}
              <div className="flex items-center gap-0.5 px-2 py-1">
                <button className={btn(activeStates.strike)}      title="删除线"    onClick={() => { editor.chain().focus().toggleStrike().run(); closeMore() }}><Strikethrough size={14} /></button>
                <button className={btn(activeStates.superscript)} title="上标 (x²)" onClick={() => { editor.chain().focus().toggleSuperscript().run(); closeMore() }}><Superscript size={14} /></button>
                <button className={btn(activeStates.subscript)}   title="下标 (x₂)" onClick={() => { editor.chain().focus().toggleSubscript().run(); closeMore() }}><Subscript size={14} /></button>
              </div>

              <div className="border-t border-gray-100 mx-2 my-0.5" />

              {/* Letter spacing */}
              <div className="flex items-center gap-1 px-2 py-1">
                <span className="text-xs text-gray-500 w-14 flex-shrink-0">字间距</span>
                <LetterSpacingDropdown editor={editor} />
              </div>

              {/* Line spacing */}
              <div className="flex items-center gap-1 px-2 py-1">
                <span className="text-xs text-gray-500 w-14 flex-shrink-0">行间距</span>
                <LineSpacingDropdown editor={editor} onOpenParagraphDialog={onOpenParagraphDialog} />
              </div>

              <div className="border-t border-gray-100 mx-2 my-0.5" />

              {/* Indent / Outdent */}
              <div className="flex items-center gap-0.5 px-2 py-1">
                <button className={btn()} title="增加首行缩进" onClick={() => { editor.chain().focus().increaseFirstLineIndent().run(); closeMore() }}><Indent size={14} /></button>
                <button className={btn()} title="减少首行缩进" onClick={() => { editor.chain().focus().decreaseFirstLineIndent().run(); closeMore() }}><Outdent size={14} /></button>
              </div>

              <div className="border-t border-gray-100 mx-2 my-0.5" />

              {/* Multi-level list / FormatPainter / Eraser */}
              <div className="flex items-center gap-0.5 px-2 py-1">
                <button
                  className={btn(activeStates.orderedList)}
                  title="多级列表（Tab 增加层级，Shift+Tab 减少层级）"
                  onClick={() => { if (!editor.isActive('orderedList')) editor.chain().focus().toggleOrderedList().run(); closeMore() }}
                >
                  <ListTree size={14} />
                </button>
                <FormatPainter editor={editor} />
                <button className={btn()} title="清除格式" onClick={() => { editor.chain().focus().unsetAllMarks().clearNodes().run(); closeMore() }}>
                  <Eraser size={14} />
                </button>
              </div>

              <div className="border-t border-gray-100 mx-2 my-0.5" />

              {/* Blockquote / CodeBlock / Table / Link */}
              <div className="flex items-center gap-0.5 px-2 py-1">
                <button className={btn(activeStates.blockquote)} title="引用块"          onClick={() => { editor.chain().focus().toggleBlockquote().run(); closeMore() }}><Quote size={14} /></button>
                <button className={btn(activeStates.codeBlock)}  title="代码块"          onClick={() => { editor.chain().focus().toggleCodeBlock().run(); closeMore() }}><Code2 size={14} /></button>
                <button className={btn()}                         title="插入表格"        onClick={() => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); closeMore() }}><Table2 size={14} /></button>
                <button className={btn(activeStates.link)}        title="超链接 (Ctrl+K)" onClick={() => { onOpenLinkDialog?.(); closeMore() }}><Link2 size={14} /></button>
              </div>

              <div className="border-t border-gray-100 mx-2 my-0.5" />

              {/* Border & shading */}
              <div className="flex items-center gap-1 px-2 py-1">
                <span className="text-xs text-gray-500 w-14 flex-shrink-0">边框底纹</span>
                <BorderShadingPanel editor={editor} />
              </div>

              <div className="border-t border-gray-100 mx-2 my-0.5" />

              {/* Column layout */}
              <div className="flex items-center gap-1 px-2 py-1">
                <span className="text-xs text-gray-500 w-14 flex-shrink-0">分栏</span>
                <ColumnDropdown columns={columns} onColumnsChange={onColumnsChange} />
              </div>

              <div className="border-t border-gray-100 mx-2 my-0.5" />

              {/* Header / Footer / Ruler */}
              <div className="flex items-center gap-0.5 px-2 py-1">
                <button
                  className="inline-flex items-center gap-1 h-7 px-2 rounded text-xs text-gray-600 hover:bg-gray-200 transition-colors"
                  title="编辑页眉"
                  onClick={() => { onOpenHeaderFooter?.('header'); closeMore() }}
                >
                  页眉
                </button>
                <button
                  className="inline-flex items-center gap-1 h-7 px-2 rounded text-xs text-gray-600 hover:bg-gray-200 transition-colors"
                  title="编辑页脚"
                  onClick={() => { onOpenHeaderFooter?.('footer'); closeMore() }}
                >
                  页脚
                </button>
                <button
                  className={`inline-flex items-center gap-1 h-7 px-2 rounded text-xs transition-colors ${showRuler ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}
                  title="显示/隐藏标尺"
                  onClick={() => { onToggleRuler?.(); closeMore() }}
                >
                  标尺
                </button>
              </div>

            </div>
          , document.body)}
        </div>

        <input ref={fileInputRef} type="file" accept=".docx" className="hidden" onChange={handleImport} />
      </div>

      {/* ── Row 2: Table context bar (only when cursor in table) ── */}
      <TableToolbar editor={editor} />
    </div>
  )
}

export default ToolBar
