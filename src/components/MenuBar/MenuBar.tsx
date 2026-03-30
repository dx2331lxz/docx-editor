import React, { useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import type { Editor } from '@tiptap/react'
import { importDocx } from '../../utils/docxHandler'
import { useDropdownPortal } from '../../hooks/useDropdownPortal'

interface MenuBarProps {
  editor: Editor | null
  onExport?: () => void
  onOpenHeaderFooter?: (mode: 'header' | 'footer') => void
  onOpenPageSetup?: () => void
  onOpenSpecialSymbols?: () => void
  onInsertTOC?: () => void
  onInsertComment?: () => void
  onOpenPageBorder?: () => void
  onOpenWordCount?: () => void
  onPrintPreview?: () => void
  onExportPDF?: () => void
  onOpenWatermark?: () => void
  onOpenProtect?: () => void
  onToggleNavPane?: () => void
  showNavPane?: boolean
  trackingEnabled?: boolean
  // Round 7 props
  onConvertToTraditional?: () => void
  onConvertToSimplified?: () => void
  onOpenBookmarks?: () => void
  onOpenDocGrid?: () => void
  onOpenStyleManager?: () => void
  onTableToText?: () => void
  onTextToTable?: () => void
  // Round 8 props
  onSmartFormat?: () => void
  onRemoveBlankLines?: () => void
  onAddFirstLineIndent?: () => void
  onRemoveLeadingSpaces?: () => void
  onFullToHalf?: () => void
  onHalfToFull?: () => void
  onToggleVertical?: () => void
  isVertical?: boolean
  onOpenEnvelope?: () => void
  onToggleSplitView?: () => void
  isSplitView?: boolean
  onOpenTheme?: () => void
  onOpenChart?: () => void
  onOpenFormula?: () => void
  onOpenDocProps?: () => void
  onOpenPageBg?: () => void
  currentThemeName?: string
  // Round 10 props
  onOpenCompare?: () => void
  onOpenWordFreq?: () => void
  onOpenTranslate?: () => void
  onToggleReadMode?: () => void
  readMode?: boolean
  // Round 11 props
  onOpenPageNumber?: () => void
  onOpenCrossRef?: () => void
  onOpenContentControl?: () => void
  onOpenMailMerge?: () => void
  // Round 12 props
  onOpenDropCap?: () => void
  onOpenSmartArt?: () => void
  onOpenAdvancedTOC?: () => void
  onOpenFootnoteSettings?: () => void
  onOpenExportOptions?: () => void
  // Round 13 props
  onOpenDocInspector?: () => void
  onToggleOutlineView?: () => void
  showOutlineView?: boolean
  onOpenCitations?: () => void
  onOpenIndex?: () => void
  onOpenWordArt?: () => void
  onOpenShapes?: () => void
  // Round 14 props
  onOpenGridPaper?: () => void
  onOpenTableAdvanced?: () => void
  onOpenTextBox?: () => void
  onOpenTemplate?: () => void
  onOpenBookFold?: () => void
  onOpenCalligraphy?: () => void
  // Round 15 props
  onOpenShortcuts?: () => void
  onOpenHighlight?: () => void
  onOpenParaBorder?: () => void
  onOpenVersionHistory?: () => void
  onOpenMacro?: () => void
  onOpenAppTheme?: () => void
  // Round 16 props
  onOpenPasteSettings?: () => void
  onToggleTwoPageView?: () => void
  isTwoPageView?: boolean
  onOpenTableChart?: () => void
  onOpenVideoEmbed?: () => void
  onOpenAdvancedFind?: () => void
  // Round 17 props
  onOpenTTS?: () => void
  onOpenDocStats?: () => void
  onOpenGrammarLint?: () => void
  onOpenCustomShortcuts?: () => void
  onOpenCloudSync?: () => void
  // Round 18 props
  onOpenAIAdvisor?: () => void
  onOpenTemplateGallery?: () => void
  onOpenDocDiff?: () => void
  onOpenFormFields?: () => void
  // Round 20 props
  onOpenVibeEditing?: () => void
  onOpenAISettings?: () => void
  onPageConfigChange?: (config: Partial<import('../PageSetup/PageSetupDialog').PageConfig>) => void
}

interface MenuItem {
  label: string
  items: { label: string; shortcut?: string; action?: () => void; divider?: boolean }[]
}

interface MenuDropdownProps {
  menu: MenuItem
  isOpen: boolean
  isAnyOpen: boolean
  onToggle: () => void
  onClose: () => void
}

const MenuDropdown: React.FC<MenuDropdownProps> = ({ menu, isOpen, isAnyOpen, onToggle, onClose }) => {
  const { triggerRef, pos, openDropdown } = useDropdownPortal()
  const dropdownDivRef = useRef<HTMLDivElement>(null)

  // Click-outside to close
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      const inTrigger = triggerRef.current?.contains(e.target as Node)
      const inDropdown = dropdownDivRef.current?.contains(e.target as Node)
      if (!inTrigger && !inDropdown) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, onClose, triggerRef])

  const handleClick = () => {
    if (isOpen) {
      onClose()
    } else {
      openDropdown()
      onToggle()
    }
  }

  const handleMouseEnter = () => {
    // Switch menus on hover only when another menu is already open
    if (isAnyOpen && !isOpen) {
      openDropdown()
      onToggle()
    }
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef as React.RefObject<HTMLButtonElement>}
        className={`px-3 py-1 rounded hover:bg-blue-100 transition-colors ${isOpen ? 'bg-blue-100' : ''}`}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
      >
        {menu.label}
      </button>

      {isOpen && ReactDOM.createPortal(
        <div
          ref={dropdownDivRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            background: 'white',
            color: '#1f2937',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 9999,
            minWidth: 160,
            maxHeight: pos.maxHeight ? Math.min(pos.maxHeight, window.innerHeight * 0.65) : window.innerHeight * 0.65,
            overflowY: 'auto',
            padding: '4px 0',
          }}
          className="menu-dropdown-light"
        >
          {menu.items.map((item, idx) =>
            item.divider ? (
              <div key={idx} className="border-t border-gray-200 my-1" />
            ) : (
              <button
                key={idx}
                className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex justify-between items-center gap-8 whitespace-nowrap text-sm text-gray-800"
                onClick={() => {
                  item.action?.()
                  onClose()
                }}
              >
                <span>{item.label}</span>
                {item.shortcut && (
                  <span className="text-xs text-gray-400">{item.shortcut}</span>
                )}
              </button>
            )
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

const MenuBar: React.FC<MenuBarProps> = ({ editor, onExport, onOpenHeaderFooter, onOpenPageSetup, onOpenSpecialSymbols, onInsertTOC, onInsertComment, onOpenPageBorder, onOpenWordCount, onPrintPreview, onExportPDF, onOpenWatermark, onOpenProtect, onToggleNavPane, showNavPane, trackingEnabled, onConvertToTraditional, onConvertToSimplified, onOpenBookmarks, onOpenDocGrid, onOpenStyleManager, onTableToText, onTextToTable, onSmartFormat, onRemoveBlankLines, onAddFirstLineIndent, onRemoveLeadingSpaces, onFullToHalf, onHalfToFull, onToggleVertical, isVertical, onOpenEnvelope, onToggleSplitView, isSplitView, onOpenTheme, onOpenChart, onOpenFormula, onOpenDocProps, onOpenPageBg, currentThemeName, onOpenCompare, onOpenWordFreq, onOpenTranslate, onToggleReadMode, readMode, onOpenPageNumber, onOpenCrossRef, onOpenContentControl, onOpenMailMerge, onOpenDropCap, onOpenSmartArt, onOpenAdvancedTOC, onOpenFootnoteSettings, onOpenExportOptions, onOpenDocInspector, onToggleOutlineView, showOutlineView, onOpenCitations, onOpenIndex, onOpenWordArt, onOpenShapes, onOpenGridPaper, onOpenTableAdvanced, onOpenTextBox, onOpenTemplate, onOpenBookFold, onOpenCalligraphy, onOpenShortcuts, onOpenHighlight, onOpenParaBorder, onOpenVersionHistory, onOpenMacro, onOpenAppTheme, onOpenPasteSettings, onToggleTwoPageView, isTwoPageView, onOpenTableChart, onOpenVideoEmbed, onOpenAdvancedFind, onOpenTTS, onOpenDocStats, onOpenGrammarLint, onOpenCustomShortcuts, onOpenCloudSync, onOpenAIAdvisor, onOpenTemplateGallery, onOpenDocDiff, onOpenFormFields, onOpenVibeEditing, onOpenAISettings, onPageConfigChange }) => {
  const [openMenu, setOpenMenu] = React.useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    const result = await importDocx(file)
    editor.commands.setContent(result.html)
    if (result.pageConfig && onPageConfigChange) {
      onPageConfigChange(result.pageConfig)
    }
    e.target.value = ''
  }

  const handleExport = () => onExport?.()

  const menus: MenuItem[] = [
    {
      label: '文件',
      items: [
        { label: '新建', shortcut: 'Ctrl+N', action: () => editor?.commands.clearContent() },
        { label: '从模板新建...', action: () => onOpenTemplate?.() },
        { label: '新建从模板...', action: () => onOpenTemplateGallery?.() },
        { label: '打开 (.docx)', action: () => fileInputRef.current?.click() },
        { divider: true, label: '' },
        { label: '导出为 .docx', action: handleExport },
        { label: '导出选项...', action: () => onOpenExportOptions?.() },
        { divider: true, label: '' },
        { label: '文档属性...', action: () => onOpenDocProps?.() },
        { divider: true, label: '' },
        { label: '文档检查器...', action: () => onOpenDocInspector?.() },
        { divider: true, label: '' },
        { label: '版本历史...', action: () => onOpenVersionHistory?.() },
        { divider: true, label: '' },
        { label: '打印预览', action: () => onPrintPreview?.() },
        { label: '导出为 PDF', shortcut: 'Ctrl+Shift+P', action: () => onExportPDF?.() },
        { label: '打印', shortcut: 'Ctrl+P', action: () => window.print() },
      ],
    },
    {
      label: '编辑',
      items: [
        { label: '撤销', shortcut: 'Ctrl+Z', action: () => editor?.commands.undo() },
        { label: '重做', shortcut: 'Ctrl+Y', action: () => editor?.commands.redo() },
        { divider: true, label: '' },
        { label: '全选', shortcut: 'Ctrl+A', action: () => editor?.commands.selectAll() },
        { divider: true, label: '' },
        { label: '高级查找...', shortcut: 'Ctrl+Shift+F', action: () => onOpenAdvancedFind?.() },
      ],
    },
    {
      label: '视图',
      items: [
        { label: '100%', action: () => {} },
        { label: '页面视图（A4）', action: () => {} },
        { divider: true, label: '' },
        { label: '标尺', action: () => {} },
        { label: showNavPane ? '✓ 导航窗格' : '导航窗格', action: () => onToggleNavPane?.() },
        { label: isSplitView ? '✓ 拆分视图' : '拆分视图', action: () => onToggleSplitView?.() },
        { label: isTwoPageView ? '✓ 双页视图' : '双页视图', action: () => onToggleTwoPageView?.() },
        { label: readMode ? '✓ 阅读模式' : '阅读模式', action: () => onToggleReadMode?.() },
        { label: showOutlineView ? '✓ 大纲视图' : '大纲视图', action: () => onToggleOutlineView?.() },
        { divider: true, label: '' },
        { label: '界面主题...', action: () => onOpenAppTheme?.() },
        { divider: true, label: '' },
        { label: '字符计数', action: () => {} },
      ],
    },
    {
      label: '插入',
      items: [
        { label: '表格', action: () => editor?.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true }) },
        { label: '图片', action: () => {} },
        { label: '链接', shortcut: 'Ctrl+K', action: () => {} },
        { divider: true, label: '' },
        { label: '图表...', action: () => onOpenChart?.() },
        { label: '公式...', action: () => onOpenFormula?.() },
        { label: 'SmartArt...', action: () => onOpenSmartArt?.() },
        { divider: true, label: '' },
        { label: '分页符', shortcut: 'Ctrl+Enter', action: () => (editor?.commands as Record<string, () => void>).insertPageBreak?.() },
        { label: '分节符（下一页）', action: () => (editor?.commands as Record<string, () => void>).insertSectionBreak?.() },
        { divider: true, label: '' },
        { label: '脚注', action: () => (editor?.commands as Record<string, () => void>).insertFootnote?.() },
        { label: '尾注', action: () => (editor?.commands as Record<string, () => void>).insertEndnote?.() },
        { label: '脚注/尾注设置...', action: () => onOpenFootnoteSettings?.() },
        { divider: true, label: '' },
        { label: '目录', action: () => onInsertTOC?.() },
        { label: '自定义目录...', action: () => onOpenAdvancedTOC?.() },
        { label: '特殊符号...', action: () => onOpenSpecialSymbols?.() },
        { divider: true, label: '' },
        { label: '书签...', action: () => onOpenBookmarks?.() },
        { label: '信封...', action: () => onOpenEnvelope?.() },
        { divider: true, label: '' },
        { label: '页眉', action: () => onOpenHeaderFooter?.('header') },
        { label: '页脚', action: () => onOpenHeaderFooter?.('footer') },
        { divider: true, label: '' },
        { label: '页码...', action: () => onOpenPageNumber?.() },
        { divider: true, label: '' },
        { label: '交叉引用...', action: () => onOpenCrossRef?.() },
        { label: '内容控件...', action: () => onOpenContentControl?.() },
        { divider: true, label: '' },
        { label: '引用管理...', action: () => onOpenCitations?.() },
        { label: '索引...', action: () => onOpenIndex?.() },
        { divider: true, label: '' },
        { label: '艺术字...', action: () => onOpenWordArt?.() },
        { label: '形状...', action: () => onOpenShapes?.() },
        { label: '文本框...', action: () => onOpenTextBox?.() },
        { divider: true, label: '' },
        { label: '在线视频...', action: () => onOpenVideoEmbed?.() },
        { divider: true, label: '' },
        { label: '表格图表...', action: () => onOpenTableChart?.() },
        { divider: true, label: '' },
        { label: '表单域...', action: () => onOpenFormFields?.() },
      ],
    },
    {
      label: '格式',
      items: [
        { label: '字体...', action: () => {} },
        { label: '段落...', action: () => {} },
        { divider: true, label: '' },
        { label: '首字下沉...', action: () => onOpenDropCap?.() },
        { divider: true, label: '' },
        { label: isVertical ? '✓ 竖排文字' : '竖排文字', action: () => onToggleVertical?.() },
        { divider: true, label: '' },
        { label: '项目符号列表', action: () => editor?.commands.toggleBulletList() },
        { label: '编号列表', action: () => editor?.commands.toggleOrderedList() },
        { divider: true, label: '' },
        { label: '文档主题...', action: () => onOpenTheme?.() },
        { label: '页面颜色...', action: () => onOpenPageBg?.() },
        { divider: true, label: '' },
        { label: '页面设置...', action: () => onOpenPageSetup?.() },
        { label: '页面边框...', action: () => onOpenPageBorder?.() },
        { label: '水印...', action: () => onOpenWatermark?.() },
        { divider: true, label: '' },
        { label: '文档网格...', action: () => onOpenDocGrid?.() },
        { label: '样式管理...', action: () => onOpenStyleManager?.() },
        { divider: true, label: '' },
        { label: '表格转文本', action: () => onTableToText?.() },
        { label: '文本转表格', action: () => onTextToTable?.() },
        { divider: true, label: '' },
        { label: '文字工具 › 智能格式整理', action: () => onSmartFormat?.() },
        { label: '文字工具 › 删除空白段落', action: () => onRemoveBlankLines?.() },
        { label: '文字工具 › 首行缩进2字符', action: () => onAddFirstLineIndent?.() },
        { label: '文字工具 › 删除段落首部空格', action: () => onRemoveLeadingSpaces?.() },
        { label: '文字工具 › 全角→半角', action: () => onFullToHalf?.() },
        { label: '文字工具 › 半角→全角', action: () => onHalfToFull?.() },
        { divider: true, label: '' },
        { label: '稿纸设置...', action: () => onOpenGridPaper?.() },
        { label: '书法字帖...', action: () => onOpenCalligraphy?.() },
        { divider: true, label: '' },
        { label: '段落边框和底纹...', action: () => onOpenParaBorder?.() },
        { divider: true, label: '' },
        { label: '书籍折页...', action: () => onOpenBookFold?.() },
        { label: '表格工具...', action: () => onOpenTableAdvanced?.() },
      ],
    },
    {
      label: '审阅',
      items: [
        { label: trackingEnabled ? '✓ 修订追踪（开启中）' : '启用修订追踪', action: () => (editor?.commands as Record<string, () => void>).toggleTrackChanges?.() },
        { label: '接受所有修订', action: () => (editor?.commands as Record<string, () => void>).acceptAllChanges?.() },
        { label: '拒绝所有修订', action: () => (editor?.commands as Record<string, () => void>).rejectAllChanges?.() },
        { label: '接受当前修订', action: () => (editor?.commands as Record<string, () => void>).acceptCurrentChange?.() },
        { divider: true, label: '' },
        { label: '插入批注', action: () => onInsertComment?.() },
        { divider: true, label: '' },
        { label: '简→繁转换', action: () => onConvertToTraditional?.() },
        { label: '繁→简转换', action: () => onConvertToSimplified?.() },
        { divider: true, label: '' },
        { label: '拼写检查', action: () => {} },
        { divider: true, label: '' },
        { label: '字数统计', action: () => onOpenWordCount?.() },
        { divider: true, label: '' },
        { label: '比较文档...', action: () => onOpenCompare?.() },
        { label: '版本对比...', action: () => onOpenDocDiff?.() },
        { label: '词频统计...', action: () => onOpenWordFreq?.() },
        { label: '翻译...', action: () => onOpenTranslate?.() },
        { divider: true, label: '' },
        { label: '✨ Vibe Editing...', action: () => onOpenVibeEditing?.() },
        { divider: true, label: '' },
        { label: '朗读文档...', action: () => onOpenTTS?.() },
        { label: '文档分析...', action: () => onOpenDocStats?.() },
        { divider: true, label: '' },
        { label: '查看所有高亮...', action: () => onOpenHighlight?.() },
        { divider: true, label: '' },
        { label: '保护文档...', action: () => onOpenProtect?.() },
        { divider: true, label: '' },
        { label: '查找', shortcut: 'Ctrl+F', action: () => {} },
        { label: '查找替换', shortcut: 'Ctrl+H', action: () => {} },
      ],
    },
    {
      label: '邮件',
      items: [
        { label: '邮件合并...', action: () => onOpenMailMerge?.() },
      ],
    },
    {
      label: '工具',
      items: [
        { label: '宏...', action: () => onOpenMacro?.() },
        { divider: true, label: '' },
        { label: 'AI排版建议...', action: () => onOpenAIAdvisor?.() },
        { divider: true, label: '' },
        { label: '语法检查...', action: () => onOpenGrammarLint?.() },
        { label: '自定义快捷键...', action: () => onOpenCustomShortcuts?.() },
        { divider: true, label: '' },
        { label: '粘贴设置...', action: () => onOpenPasteSettings?.() },
        { divider: true, label: '' },
        { label: '应用段落样式', action: () => {} },
      ],
    },
    {
      label: '帮助',
      items: [
        { label: '关于', action: () => {} },
        { label: '快捷键...', action: () => onOpenShortcuts?.() },
      ],
    },
  ]

  return (
    <div className="relative flex items-center glass-menubar bg-gray-100 border-b border-gray-300 px-2 h-8 text-sm select-none z-50">
      {/* App logo */}
      <span className="font-bold text-blue-600 mr-4 text-base">📝 DocxEditor</span>

      {menus.map((menu) => (
        <MenuDropdown
          key={menu.label}
          menu={menu}
          isOpen={openMenu === menu.label}
          isAnyOpen={openMenu !== null}
          onToggle={() => setOpenMenu(menu.label)}
          onClose={() => setOpenMenu(null)}
        />
      ))}

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx"
        className="hidden"
        onChange={handleImport}
      />
    </div>
  )
}

export default MenuBar
