import React, { useState, useEffect, useRef, useCallback } from 'react'
import MenuBar from './components/MenuBar/MenuBar'
import ToolBar from './components/ToolBar/ToolBar'
import EditorCanvas from './components/Editor/EditorCanvas'
import type { ColumnCount } from './components/Editor/EditorCanvas'
import StatusBar from './components/StatusBar/StatusBar'
import { useDocxEditor } from './components/Editor/DocxEditor'
import { exportDocx } from './utils/docxHandler'
import { generatePreviewHtml } from './utils/previewUtils'
import FindReplaceDialog from './components/FindReplace/FindReplaceDialog'
import ParagraphDialog from './components/ParagraphDialog/ParagraphDialog'
import PageSetupDialog, { DEFAULT_PAGE_CONFIG } from './components/PageSetup/PageSetupDialog'
import type { PageConfig } from './components/PageSetup/PageSetupDialog'
import SpecialSymbolsPanel from './components/SpecialSymbols/SpecialSymbolsPanel'
import CommentPanel from './components/Comment/CommentPanel'
import LinkDialog from './components/Link/LinkDialog'
import WordCountDialog from './components/WordCount/WordCountDialog'
import PageBorderDialog, { DEFAULT_PAGE_BORDER } from './components/PageBorder/PageBorderDialog'
import type { PageBorderConfig } from './components/PageBorder/PageBorderDialog'
import PrintPreviewOverlay from './components/PrintPreview/PrintPreviewOverlay'
import WatermarkDialog, { DEFAULT_WATERMARK } from './components/Watermark/WatermarkDialog'
import type { WatermarkConfig } from './components/Watermark/WatermarkDialog'
import DocProtectDialog, { DEFAULT_PROTECTION, UnlockDialog } from './components/DocProtect/DocProtectDialog'
import type { DocProtectionConfig } from './components/DocProtect/DocProtectDialog'
import NavigationPane from './components/NavigationPane/NavigationPane'
import type { Comment } from './extensions/CommentMark'
import { useAutoSave } from './hooks/useAutoSave'
import SaveToast from './components/SaveToast/SaveToast'
import type { EditorStats, AIDocument } from './types/editor'
import BookmarkDialog from './components/Bookmark/BookmarkDialog'
import DocGridDialog, { DEFAULT_DOC_GRID } from './components/DocGrid/DocGridDialog'
import type { DocGridConfig } from './components/DocGrid/DocGridDialog'
import TableConvertDialog from './components/TableConvert/TableConvertDialog'
import StyleManager from './components/StyleManager/StyleManager'
import type { DocStyle } from './components/StyleManager/StyleManager'
import EnvelopeDialog from './components/Envelope/EnvelopeDialog'
import ThemeDialog, { THEMES } from './components/Theme/ThemeDialog'
import type { DocTheme } from './components/Theme/ThemeDialog'
import ChartDialog from './components/Chart/ChartDialog'
import FormulaDialog from './components/Formula/FormulaDialog'
import DocPropsDialog, { DEFAULT_DOC_PROPS } from './components/DocProps/DocPropsDialog'
import type { DocProperties } from './components/DocProps/DocPropsDialog'
import PageBackgroundDialog, { DEFAULT_PAGE_BG, getPageBgStyle } from './components/PageBackground/PageBackgroundDialog'
import type { PageBgConfig } from './components/PageBackground/PageBackgroundDialog'
import SplitView from './components/SplitView/SplitView'
import FontMissingBanner from './components/FontWarning/FontMissingBanner'
import { smartFormat, removeBlankParagraphs, addFirstLineIndent, removeLeadingSpaces, fullToHalf, halfToFull } from './utils/textTools'
import CompareDialog from './components/Compare/CompareDialog'
import WordFreqDialog from './components/WordFreq/WordFreqDialog'
import TranslateDialog from './components/Translate/TranslateDialog'
import ReadModeOverlay from './components/ReadMode/ReadModeOverlay'
import PageNumberDialog from './components/PageNumber/PageNumberDialog'
import type { PageNumConfig } from './components/PageNumber/PageNumberDialog'
import CrossRefDialog from './components/CrossRef/CrossRefDialog'
import ContentControlDialog from './components/ContentControl/ContentControlDialog'
import MailMergeDialog from './components/MailMerge/MailMergeDialog'
import DropCapDialog from './components/DropCap/DropCapDialog'
import SmartArtDialog from './components/SmartArt/SmartArtDialog'
import AdvancedTOCDialog from './components/AdvancedTOC/AdvancedTOCDialog'
import FootnoteSettingsDialog from './components/FootnoteSettings/FootnoteSettingsDialog'
import ExportOptionsDialog from './components/ExportOptions/ExportOptionsDialog'
import DocInspectorDialog from './components/DocInspector/DocInspectorDialog'
import OutlinePanel from './components/OutlineView/OutlinePanel'
import CitationsDialog from './components/Citations/CitationsDialog'
import IndexDialog from './components/Index/IndexDialog'
import WordArtDialog from './components/WordArt/WordArtDialog'
import ShapesDialog from './components/Shapes/ShapesDialog'
import GridPaperDialog, { DEFAULT_GRID_PAPER, buildGridCss } from './components/GridPaper/GridPaperDialog'
import type { GridPaperConfig } from './components/GridPaper/GridPaperDialog'
import TableAdvancedDialog from './components/TableAdvanced/TableAdvancedDialog'
import TextBoxDialog from './components/TextBox/TextBoxDialog'
import TemplateDialog from './components/DocTemplate/TemplateDialog'
import BookFoldDialog, { DEFAULT_BOOK_FOLD } from './components/BookFold/BookFoldDialog'
import type { BookFoldConfig } from './components/BookFold/BookFoldDialog'
import CalligraphyDialog from './components/Calligraphy/CalligraphyDialog'
import KeyboardShortcutsPanel from './components/KeyboardShortcuts/KeyboardShortcutsPanel'
import HighlightPanel from './components/HighlightPanel/HighlightPanel'
import ParagraphBorderDialog from './components/ParagraphBorder/ParagraphBorderDialog'
import VersionHistoryPanel from './components/VersionHistory/VersionHistoryPanel'
import MacroDialog from './components/Macro/MacroDialog'
import AppThemeDialog from './components/AppTheme/AppThemeDialog'
import PasteSettingsDialog from './components/PasteSettings/PasteSettingsDialog'
import TwoPageViewWrapper from './components/TwoPageView/TwoPageViewWrapper'
import TableChartDialog from './components/TableChart/TableChartDialog'
import VideoEmbedDialog from './components/VideoEmbed/VideoEmbedDialog'
import AdvancedFindDialog from './components/AdvancedFind/AdvancedFindDialog'
// Round 17
import TextToSpeechPanel from './components/TextToSpeech/TextToSpeechPanel'
import DocStatsDashboard from './components/DocStats/DocStatsDashboard'
import GrammarLintPanel from './components/GrammarLint/GrammarLintPanel'
import CustomShortcutsDialog from './components/CustomShortcuts/CustomShortcutsDialog'
import CloudSyncDialog from './components/CloudSync/CloudSyncDialog'
// Round 18
import AIAdvisorPanel from './components/AIAdvisor/AIAdvisorPanel'
import { TabBar } from './components/TabBar/TabBar'
import type { Tab } from './components/TabBar/TabBar'
import TemplateGalleryDialog from './components/TemplateGallery/TemplateGalleryDialog'
import DocDiffDialog from './components/DocDiff/DocDiffDialog'
import FormFieldDialog from './components/FormFields/FormFieldDialog'
import './styles/mobile.css'
// Round 20
import VibeEditingPanel from './components/VibeEditing/VibeEditingPanel'
// Settings & File Manager
import SettingsPanel from './components/Settings/SettingsPanel'
import FileManagerSidebar from './components/FileManager/FileManagerSidebar'
import type { DocFile } from './components/FileManager/FileManagerSidebar'

const App: React.FC = () => {
  // Clear legacy localStorage draft on startup (replaced by server-side file storage)
  useEffect(() => {
    localStorage.removeItem('docx-editor-autosave')
    localStorage.removeItem('docx-editor-normal-exit')
  }, [])

  const [stats, setStats] = useState<EditorStats>({ characters: 0, words: 0, paragraphs: 0 })
  const [currentDoc, setCurrentDoc] = useState<AIDocument | null>(null)
  const [showFindReplace, setShowFindReplace] = useState(false)
  const [findReplaceMode, setFindReplaceMode] = useState<'find' | 'replace'>('find')
  const [showParagraphDialog, setShowParagraphDialog] = useState(false)
  const [showPageSetup, setShowPageSetup] = useState(false)
  const [pageConfig, setPageConfig] = useState<PageConfig>(DEFAULT_PAGE_CONFIG)
  const [totalPages, setTotalPages] = useState(1)
  const [showSpecialSymbols, setShowSpecialSymbols] = useState(false)
  const [showCommentPanel, setShowCommentPanel] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showWordCount, setShowWordCount] = useState(false)
  const [showPageBorder, setShowPageBorder] = useState(false)
  const [pageBorder, setPageBorder] = useState<PageBorderConfig>(DEFAULT_PAGE_BORDER)
  const [printPreview, setPrintPreview] = useState(false)
  const [trackingEnabled, setTrackingEnabled] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  // Watermark
  const [showWatermark, setShowWatermark] = useState(false)
  const [watermark, setWatermark] = useState<WatermarkConfig>(DEFAULT_WATERMARK)
  // Document protection
  const [showProtectDialog, setShowProtectDialog] = useState(false)
  const [showUnlockDialog, setShowUnlockDialog] = useState(false)
  const [docProtection, setDocProtection] = useState<DocProtectionConfig>(DEFAULT_PROTECTION)
  // Navigation pane
  const [showNavPane, setShowNavPane] = useState(false)

  // Round 7 features
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [showDocGrid, setShowDocGrid] = useState(false)
  const [docGrid, setDocGrid] = useState<DocGridConfig>(DEFAULT_DOC_GRID)
  const [showTableConvert, setShowTableConvert] = useState(false)
  const [tableConvertMode, setTableConvertMode] = useState<'tableToText' | 'textToTable'>('tableToText')
  const [showStyleManager, setShowStyleManager] = useState(false)
  const [customStyles, setCustomStyles] = useState<DocStyle[]>([])

  // Round 8 state
  const [isVertical, setIsVertical] = useState(false)
  const [isSplitView, setIsSplitView] = useState(false)
  const [showEnvelope, setShowEnvelope] = useState(false)
  const [showTheme, setShowTheme] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<DocTheme>(THEMES[0])
  const [showChart, setShowChart] = useState(false)
  const [showFormula, setShowFormula] = useState(false)
  const [showDocProps, setShowDocProps] = useState(false)
  const [docProps, setDocProps] = useState<DocProperties>(DEFAULT_DOC_PROPS)
  const [showPageBg, setShowPageBg] = useState(false)
  const [pageBg, setPageBg] = useState<PageBgConfig>(DEFAULT_PAGE_BG)
  const [missingFonts, setMissingFonts] = useState<string[]>([])

  // Round 10 state
  const [showCompare, setShowCompare] = useState(false)
  const [showWordFreq, setShowWordFreq] = useState(false)
  const [showTranslate, setShowTranslate] = useState(false)
  const [translateInitialText, setTranslateInitialText] = useState('')
  const [readMode, setReadMode] = useState(false)

  // Round 11 state
  const [showPageNumber, setShowPageNumber] = useState(false)
  const [showCrossRef, setShowCrossRef] = useState(false)
  const [showContentControl, setShowContentControl] = useState(false)
  const [showMailMerge, setShowMailMerge] = useState(false)

  // Round 12 state
  const [showDropCap, setShowDropCap] = useState(false)
  const [showSmartArt, setShowSmartArt] = useState(false)
  const [showAdvancedTOC, setShowAdvancedTOC] = useState(false)
  const [showFootnoteSettings, setShowFootnoteSettings] = useState(false)
  const [showExportOptions, setShowExportOptions] = useState(false)
  // Round 13 state
  const [showDocInspector, setShowDocInspector] = useState(false)
  const [showOutlineView, setShowOutlineView] = useState(false)
  const [showCitations, setShowCitations] = useState(false)
  const [showIndex, setShowIndex] = useState(false)
  const [showWordArt, setShowWordArt] = useState(false)
  const [showShapes, setShowShapes] = useState(false)
  // Round 14 state
  const [showGridPaper, setShowGridPaper] = useState(false)
  const [gridPaper, setGridPaper] = useState<GridPaperConfig>(DEFAULT_GRID_PAPER)
  const [showTableAdvanced, setShowTableAdvanced] = useState(false)
  const [showTextBox, setShowTextBox] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [showBookFold, setShowBookFold] = useState(false)
  const [bookFold, setBookFold] = useState<BookFoldConfig>(DEFAULT_BOOK_FOLD)
  const [showCalligraphy, setShowCalligraphy] = useState(false)
  // Round 15 state
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showHighlight, setShowHighlight] = useState(false)
  const [showParaBorder, setShowParaBorder] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showMacro, setShowMacro] = useState(false)
  const [showAppTheme, setShowAppTheme] = useState(false)
  // Round 16 state
  const [showPasteSettings, setShowPasteSettings] = useState(false)
  const [isTwoPageView, setIsTwoPageView] = useState(false)
  const [showTableChart, setShowTableChart] = useState(false)
  const [showVideoEmbed, setShowVideoEmbed] = useState(false)
  const [showAdvancedFind, setShowAdvancedFind] = useState(false)
  // Round 17 state
  const [showTTS, setShowTTS] = useState(false)
  const [showDocStats, setShowDocStats] = useState(false)
  const [showGrammarLint, setShowGrammarLint] = useState(false)
  const [showCustomShortcuts, setShowCustomShortcuts] = useState(false)
  const [showCloudSync, setShowCloudSync] = useState(false)
  // Round 18 state
  const [showAIAdvisor, setShowAIAdvisor] = useState(false)
  const [showTemplateGallery, setShowTemplateGallery] = useState(false)
  const [showDocDiff, setShowDocDiff] = useState(false)
  const [showFormFields, setShowFormFields] = useState(false)
  // Round 20 state
  const [showVibeEditing, setShowVibeEditing] = useState(false)
  const [vibePanelWidth, setVibePanelWidth] = useState(360)
  // File manager state
  const [openFileId, setOpenFileId] = useState<string | null>(null)
  // Tab bar state
  const [tabs, setTabs] = useState<Tab[]>([{ id: 'tab-1', title: '新文档', content: '', isDirty: false }])
  const [activeTabId, setActiveTabId] = useState('tab-1')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  // Header / footer
  const [headerContent, setHeaderContent] = useState('')
  const [footerContent, setFooterContent] = useState('')
  const [headerFooterMode, setHeaderFooterMode] = useState<'off' | 'header' | 'footer'>('off')

  // Layout
  const [columns, setColumns] = useState<ColumnCount>(1)
  const [showRuler, setShowRuler] = useState(false)

  const editor = useDocxEditor({ onStatsChange: setStats, onDocumentChange: setCurrentDoc })
  const { lastSaved } = useAutoSave(editor)

  const handleExport = async () => {    if (!currentDoc || !editor) return
    const blob = await exportDocx(currentDoc, pageConfig, editor.getHTML())
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'document.docx'; a.click()
    URL.revokeObjectURL(url)
  }

  const handlePreview = () => {
    if (!editor) return
    const html = generatePreviewHtml(editor, pageConfig)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  const handleExportPDF = useCallback(() => {
    if (!editor) return
    const html = generatePreviewHtml(editor, pageConfig)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (win) {
      win.addEventListener('load', () => {
        win.print()
        setTimeout(() => URL.revokeObjectURL(url), 60_000)
      })
    }
  }, [editor, pageConfig])

  const handleExportPDFRef = useRef(handleExportPDF)
  useEffect(() => { handleExportPDFRef.current = handleExportPDF }, [handleExportPDF])

  const handleAddComment = (text: string) => {
    if (!editor) return
    const id = `comment-${Date.now()}`
    const now = new Date()
    const createdAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    editor.chain().focus().setComment(id).run()
    setComments((prev) => [...prev, { id, text, createdAt }])
  }

  const handleDeleteComment = (id: string) => {
    if (!editor) return
    // Remove marks with this comment id from entire doc
    const { doc, tr } = editor.state
    doc.descendants((node, pos) => {
      node.marks.forEach((mark) => {
        if (mark.type.name === 'comment' && mark.attrs.commentId === id) {
          tr.removeMark(pos, pos + node.nodeSize, mark.type)
        }
      })
    })
    editor.view.dispatch(tr)
    setComments((prev) => prev.filter((c) => c.id !== id))
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault()
        setFindReplaceMode('find')
        setShowFindReplace(true)
      } else if (e.ctrlKey && e.key === 'h') {
        e.preventDefault()
        setFindReplaceMode('replace')
        setShowFindReplace(true)
      } else if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        handleExportPDFRef.current()
      } else if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        setShowLinkDialog(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Track changes toggle event listener
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ enabled: boolean }>
      setTrackingEnabled(custom.detail.enabled)
    }
    document.addEventListener('trackchanges:toggle', handler)
    return () => document.removeEventListener('trackchanges:toggle', handler)
  }, [])

  // Read mode: toggle editor editability
  useEffect(() => {
    if (!editor) return
    editor.setEditable(!readMode)
  }, [editor, readMode])

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const handleOpenTranslate = () => {
    if (editor) {
      const { from, to } = editor.state.selection
      const selected = from !== to ? editor.state.doc.textBetween(from, to) : ''
      setTranslateInitialText(selected)
    }
    setShowTranslate(true)
  }

  const editorCanvas = (
    <EditorCanvas
      editor={editor}
      showRuler={showRuler}
      columns={columns}
      headerContent={headerContent}
      footerContent={footerContent}
      onHeaderChange={setHeaderContent}
      onFooterChange={setFooterContent}
      onEditHeader={() => setHeaderFooterMode('header')}
      onEditFooter={() => setHeaderFooterMode('footer')}
      headerFooterMode={headerFooterMode}
      onExitHeaderFooter={() => setHeaderFooterMode('off')}
      pageConfig={pageConfig}
      pageBorder={pageBorder}
      watermark={watermark}
      onInsertComment={() => setShowCommentPanel(true)}
      readOnly={docProtection.mode === 'readonly'}
      docGrid={docGrid}
      isVertical={isVertical}
      pageBg={pageBg}
      themeClass={currentTheme.bgClass}
      onTranslate={handleOpenTranslate}
      onPageCountChange={setTotalPages}
    />
  )

  const handleUnlock = (pwd: string) => {
    if (!docProtection.password || docProtection.password === pwd) {
      setDocProtection(DEFAULT_PROTECTION)
      setShowUnlockDialog(false)
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={showVibeEditing ? { paddingRight: vibePanelWidth } : undefined}>
      {!printPreview && (
        <>
          {/* Font missing banner */}
          <FontMissingBanner missingFonts={missingFonts} onDismiss={() => setMissingFonts([])} />
          {/* Protection banner */}
          {docProtection.mode !== 'none' && (
            <div className="flex items-center justify-between px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex-shrink-0">
              <span className="flex items-center gap-2">
                🔒 文档受保护（{docProtection.mode === 'readonly' ? '只读' : '仅允许批注'}）
                {docProtection.password && ' · 需要密码解锁'}
              </span>
              <button
                type="button"
                className="px-2 py-0.5 rounded bg-amber-200 hover:bg-amber-300 text-amber-800 font-medium"
                onClick={() => docProtection.password ? setShowUnlockDialog(true) : setDocProtection(DEFAULT_PROTECTION)}
              >
                解除保护
              </button>
            </div>
          )}
          <MenuBar
            editor={editor}
            onExport={handleExport}
            onOpenHeaderFooter={setHeaderFooterMode}
            onOpenPageSetup={() => setShowPageSetup(true)}
            onOpenSpecialSymbols={() => setShowSpecialSymbols(true)}
            onInsertTOC={() => {
              ;(editor?.chain().focus() as Record<string, () => unknown>).insertTableOfContents?.()
            }}
            onInsertComment={() => setShowCommentPanel(true)}
            onOpenPageBorder={() => setShowPageBorder(true)}
            onOpenWordCount={() => setShowWordCount(true)}
            onPrintPreview={() => setPrintPreview(true)}
            onOpenWatermark={() => setShowWatermark(true)}
            onOpenProtect={() => setShowProtectDialog(true)}
            onToggleNavPane={() => setShowNavPane((v) => !v)}
            showNavPane={showNavPane}
            trackingEnabled={trackingEnabled}
            onConvertToTraditional={() => (editor?.commands as Record<string, () => void>).convertToTraditional?.()}
            onConvertToSimplified={() => (editor?.commands as Record<string, () => void>).convertToSimplified?.()}
            onOpenBookmarks={() => setShowBookmarks(true)}
            onOpenDocGrid={() => setShowDocGrid(true)}
            onOpenStyleManager={() => setShowStyleManager(true)}
            onTableToText={() => { setTableConvertMode('tableToText'); setShowTableConvert(true) }}
            onTextToTable={() => { setTableConvertMode('textToTable'); setShowTableConvert(true) }}
            onSmartFormat={() => editor && smartFormat(editor)}
            onRemoveBlankLines={() => editor && removeBlankParagraphs(editor)}
            onAddFirstLineIndent={() => editor && addFirstLineIndent(editor)}
            onRemoveLeadingSpaces={() => editor && removeLeadingSpaces(editor)}
            onFullToHalf={() => editor && fullToHalf(editor)}
            onHalfToFull={() => editor && halfToFull(editor)}
            onToggleVertical={() => setIsVertical(v => !v)}
            isVertical={isVertical}
            onOpenEnvelope={() => setShowEnvelope(true)}
            onToggleSplitView={() => setIsSplitView(v => !v)}
            isSplitView={isSplitView}
            onOpenTheme={() => setShowTheme(true)}
            onOpenChart={() => setShowChart(true)}
            onOpenFormula={() => setShowFormula(true)}
            onOpenDocProps={() => setShowDocProps(true)}
            onOpenPageBg={() => setShowPageBg(true)}
            currentThemeName={currentTheme.name}
            onOpenCompare={() => setShowCompare(true)}
            onOpenWordFreq={() => setShowWordFreq(true)}
            onOpenTranslate={handleOpenTranslate}
            onToggleReadMode={() => setReadMode((v) => !v)}
            readMode={readMode}
            onOpenPageNumber={() => setShowPageNumber(true)}
            onOpenCrossRef={() => setShowCrossRef(true)}
            onOpenContentControl={() => setShowContentControl(true)}
            onOpenMailMerge={() => setShowMailMerge(true)}
            onOpenDropCap={() => setShowDropCap(true)}
            onOpenSmartArt={() => setShowSmartArt(true)}
            onOpenAdvancedTOC={() => setShowAdvancedTOC(true)}
            onOpenFootnoteSettings={() => setShowFootnoteSettings(true)}
            onOpenExportOptions={() => setShowExportOptions(true)}
            onOpenDocInspector={() => setShowDocInspector(true)}
            onToggleOutlineView={() => setShowOutlineView(v => !v)}
            showOutlineView={showOutlineView}
            onOpenCitations={() => setShowCitations(true)}
            onOpenIndex={() => setShowIndex(true)}
            onOpenWordArt={() => setShowWordArt(true)}
            onOpenShapes={() => setShowShapes(true)}
            onOpenGridPaper={() => setShowGridPaper(true)}
            onOpenTableAdvanced={() => setShowTableAdvanced(true)}
            onOpenTextBox={() => setShowTextBox(true)}
            onOpenTemplate={() => setShowTemplate(true)}
            onOpenBookFold={() => setShowBookFold(true)}
            onOpenCalligraphy={() => setShowCalligraphy(true)}
            onOpenShortcuts={() => setShowShortcuts(true)}
            onOpenHighlight={() => setShowHighlight(true)}
            onOpenParaBorder={() => setShowParaBorder(true)}
            onOpenVersionHistory={() => setShowVersionHistory(true)}
            onOpenMacro={() => setShowMacro(true)}
            onOpenAppTheme={() => setShowAppTheme(true)}
            onOpenPasteSettings={() => setShowPasteSettings(true)}
            onToggleTwoPageView={() => setIsTwoPageView(v => !v)}
            isTwoPageView={isTwoPageView}
            onOpenTableChart={() => setShowTableChart(true)}
            onOpenVideoEmbed={() => setShowVideoEmbed(true)}
            onOpenAdvancedFind={() => setShowAdvancedFind(true)}
            onOpenTTS={() => setShowTTS(true)}
            onOpenDocStats={() => setShowDocStats(true)}
            onOpenGrammarLint={() => setShowGrammarLint(true)}
            onOpenCustomShortcuts={() => setShowCustomShortcuts(true)}
            onOpenCloudSync={() => setShowCloudSync(true)}
            onOpenAIAdvisor={() => setShowAIAdvisor(true)}
            onOpenTemplateGallery={() => setShowTemplateGallery(true)}
            onOpenDocDiff={() => setShowDocDiff(true)}
            onOpenFormFields={() => setShowFormFields(true)}
            onOpenVibeEditing={() => setShowVibeEditing(true)}
            onExportPDF={handleExportPDF}
            onPageConfigChange={(partial) => setPageConfig(prev => ({ ...prev, ...partial }))}
          />
          <ToolBar
            editor={editor}
            onExport={handleExport}
            onOpenParagraphDialog={() => setShowParagraphDialog(true)}
            onOpenHeaderFooter={setHeaderFooterMode}
            onOpenLinkDialog={() => setShowLinkDialog(true)}
            onToggleCommentPanel={() => setShowCommentPanel((v) => !v)}
            showCommentPanel={showCommentPanel}
            trackingEnabled={trackingEnabled}
            columns={columns}
            onColumnsChange={setColumns}
            showRuler={showRuler}
            onToggleRuler={() => setShowRuler((v) => !v)}
            onOpenStyleManager={() => setShowStyleManager(true)}
            onOpenVibeEditing={() => setShowVibeEditing(true)}
            onPreview={handlePreview}
            onPageConfigChange={(partial) => setPageConfig(prev => ({ ...prev, ...partial }))}
          />
        </>
      )}

      {!printPreview && (
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabSelect={(id) => setActiveTabId(id)}
          onTabClose={(id) => {
            const remaining = tabs.filter(t => t.id !== id)
            setTabs(remaining)
            if (activeTabId === id && remaining.length > 0) {
              setActiveTabId(remaining[remaining.length - 1].id)
            }
          }}
          onTabNew={() => {
            const newId = `tab-${Date.now()}`
            setTabs(prev => [...prev, { id: newId, title: `新文档 ${prev.length + 1}`, content: '', isDirty: false }])
            setActiveTabId(newId)
          }}
          onTabRename={(id, title) => setTabs(prev => prev.map(t => t.id === id ? { ...t, title } : t))}
        />
      )}

      {printPreview ? (
        <PrintPreviewOverlay onExit={() => setPrintPreview(false)}>
          {editorCanvas}
        </PrintPreviewOverlay>
      ) : (
        <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          {/* File Manager Sidebar */}
          <FileManagerSidebar
            editor={editor}
            currentDoc={currentDoc}
            pageConfig={pageConfig}
            openFileId={openFileId}
            onPageConfigChange={(partial) => setPageConfig(prev => ({ ...prev, ...partial }))}
            onDocOpened={(file: DocFile) => {
              setOpenFileId(file.id || null)
              if (file.name && file.id) {
                setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, title: file.name } : t))
              }
            }}
          />
          {showNavPane && editor && (
            <NavigationPane editor={editor} onClose={() => setShowNavPane(false)} />
          )}
          {showOutlineView && (
            <OutlinePanel editor={editor} onClose={() => setShowOutlineView(false)} />
          )}
          {isSplitView ? (
            <SplitView
              editor={editor}
              columns={columns}
              pageConfig={pageConfig}
              pageBorder={pageBorder}
              watermark={watermark}
              docGrid={docGrid}
              readOnly={docProtection.mode === 'readonly'}
              isVertical={isVertical}
              pageBg={pageBg}
              themeClass={currentTheme.bgClass}
            />
          ) : isTwoPageView ? (
            <TwoPageViewWrapper
              editor={editor}
              showRuler={showRuler}
              pageConfig={pageConfig}
              pageBorder={pageBorder}
              watermark={watermark}
              docGrid={docGrid}
              isVertical={isVertical}
              pageBg={pageBg}
              themeClass={currentTheme.bgClass}
              headerContent={headerContent}
              footerContent={footerContent}
              onHeaderChange={setHeaderContent}
              onFooterChange={setFooterContent}
              headerFooterMode={headerFooterMode}
              onEditHeader={() => setHeaderFooterMode('header')}
              onEditFooter={() => setHeaderFooterMode('footer')}
              onExitHeaderFooter={() => setHeaderFooterMode('off')}
              readOnly={docProtection.mode === 'readonly'}
              onInsertComment={() => setShowCommentPanel(true)}
              onTranslate={handleOpenTranslate}
              onExitTwoPage={() => setIsTwoPageView(false)}
            />
          ) : (
            <div style={gridPaper.enabled ? { ...buildGridCss(gridPaper), flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' } : { flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              {editorCanvas}
            </div>
          )}
          {showCommentPanel && (
            <CommentPanel
              editor={editor}
              comments={comments}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
            />
          )}
          
        </div>
      )}

      {!printPreview && (
        <StatusBar
          stats={stats}
          lastSaved={lastSaved}
          totalPages={totalPages}
          onOpenWordCount={() => setShowWordCount(true)}
        />
      )}

      {/* Settings panel — fixed bottom-left button + drawer */}
      <SettingsPanel currentFileId={openFileId} />

      {/* Vibe Editing panel — fixed full-height overlay */}
      {showVibeEditing && (
        <VibeEditingPanel
          editor={editor}
          onClose={() => setShowVibeEditing(false)}
          width={vibePanelWidth}
          onWidthChange={setVibePanelWidth}
          onPageConfigChange={(updater) => setPageConfig(prev => updater(prev))}
          pageConfig={pageConfig}
        />
      )}

      {showFindReplace && editor && (
        <FindReplaceDialog
          editor={editor}
          mode={findReplaceMode}
          onClose={() => setShowFindReplace(false)}
        />
      )}
      {showParagraphDialog && editor && (
        <ParagraphDialog
          editor={editor}
          onClose={() => setShowParagraphDialog(false)}
        />
      )}
      {showPageSetup && (
        <PageSetupDialog
          config={pageConfig}
          onApply={setPageConfig}
          onClose={() => setShowPageSetup(false)}
        />
      )}
      {showSpecialSymbols && editor && (
        <SpecialSymbolsPanel
          editor={editor}
          onClose={() => setShowSpecialSymbols(false)}
        />
      )}
      {showLinkDialog && editor && (
        <LinkDialog
          editor={editor}
          onClose={() => setShowLinkDialog(false)}
        />
      )}
      {showWordCount && editor && (
        <WordCountDialog
          editor={editor}
          onClose={() => setShowWordCount(false)}
        />
      )}
      {showPageBorder && (
        <PageBorderDialog
          config={pageBorder}
          onApply={setPageBorder}
          onClose={() => setShowPageBorder(false)}
        />
      )}
      {showWatermark && (
        <WatermarkDialog
          config={watermark}
          onApply={setWatermark}
          onClose={() => setShowWatermark(false)}
        />
      )}
      {showProtectDialog && (
        <DocProtectDialog
          config={docProtection}
          onApply={setDocProtection}
          onClose={() => setShowProtectDialog(false)}
        />
      )}
      {showUnlockDialog && (
        <UnlockDialog
          onUnlock={handleUnlock}
          onClose={() => setShowUnlockDialog(false)}
        />
      )}

      {/* Round 7 dialogs */}
      {showBookmarks && (
        <BookmarkDialog
          editor={editor}
          onClose={() => setShowBookmarks(false)}
        />
      )}
      {showDocGrid && (
        <DocGridDialog
          config={docGrid}
          onApply={setDocGrid}
          onClose={() => setShowDocGrid(false)}
        />
      )}
      {showTableConvert && editor && (
        <TableConvertDialog
          editor={editor}
          mode={tableConvertMode}
          onClose={() => setShowTableConvert(false)}
        />
      )}
      {showStyleManager && (
        <StyleManager
          editor={editor}
          customStyles={customStyles}
          onCustomStylesChange={setCustomStyles}
          onClose={() => setShowStyleManager(false)}
        />
      )}

      {/* Round 8 dialogs */}
      {showEnvelope && (
        <EnvelopeDialog
          editor={editor}
          onClose={() => setShowEnvelope(false)}
        />
      )}

      {/* Round 9 dialogs */}
      {showTheme && (
        <ThemeDialog
          currentTheme={currentTheme}
          onApply={(t) => { setCurrentTheme(t); setShowTheme(false) }}
          onClose={() => setShowTheme(false)}
        />
      )}
      {showChart && editor && (
        <ChartDialog
          editor={editor}
          onClose={() => setShowChart(false)}
        />
      )}
      {showFormula && editor && (
        <FormulaDialog
          editor={editor}
          onClose={() => setShowFormula(false)}
        />
      )}
      {showDocProps && (
        <DocPropsDialog
          editor={editor}
          properties={docProps}
          onSave={(p) => { setDocProps(p); setShowDocProps(false) }}
          onClose={() => setShowDocProps(false)}
        />
      )}
      {showPageBg && (
        <PageBackgroundDialog
          config={pageBg}
          onApply={(c) => { setPageBg(c); setShowPageBg(false) }}
          onClose={() => setShowPageBg(false)}
        />
      )}

      {/* Auto-save UI */}
      <SaveToast />
      {/* Round 10 dialogs */}
      {showCompare && (
        <CompareDialog
          editor={editor}
          onClose={() => setShowCompare(false)}
        />
      )}
      {showWordFreq && (
        <WordFreqDialog
          editor={editor}
          onClose={() => setShowWordFreq(false)}
        />
      )}
      {showTranslate && (
        <TranslateDialog
          editor={editor}
          initialText={translateInitialText}
          onClose={() => setShowTranslate(false)}
        />
      )}
      {readMode && (
        <ReadModeOverlay
          editor={editor}
          onExit={() => setReadMode(false)}
        />
      )}

      {/* Round 11 dialogs */}
      {showPageNumber && (
        <PageNumberDialog
          editor={editor}
          onInsertToFooter={(cfg: PageNumConfig) => {
            // Insert page number marker into footer/header content
            const marker = cfg.position === 'header' ? `{page:${cfg.format}:${cfg.startPage}:${cfg.align}}` : `{page:${cfg.format}:${cfg.startPage}:${cfg.align}}`
            if (cfg.position === 'footer') setFooterContent(prev => prev ? `${prev} ${marker}` : marker)
            else if (cfg.position === 'header') setHeaderContent(prev => prev ? `${prev} ${marker}` : marker)
          }}
          onClose={() => setShowPageNumber(false)}
        />
      )}
      {showCrossRef && (
        <CrossRefDialog
          editor={editor}
          onClose={() => setShowCrossRef(false)}
        />
      )}
      {showContentControl && (
        <ContentControlDialog
          editor={editor}
          onClose={() => setShowContentControl(false)}
        />
      )}
      {showMailMerge && (
        <MailMergeDialog
          editor={editor}
          onClose={() => setShowMailMerge(false)}
        />
      )}

      {/* Round 12 dialogs */}
      {showDropCap && (
        <DropCapDialog
          editor={editor}
          onClose={() => setShowDropCap(false)}
        />
      )}
      {showSmartArt && (
        <SmartArtDialog
          editor={editor}
          onClose={() => setShowSmartArt(false)}
        />
      )}
      {showAdvancedTOC && (
        <AdvancedTOCDialog
          editor={editor}
          onClose={() => setShowAdvancedTOC(false)}
        />
      )}
      {showFootnoteSettings && (
        <FootnoteSettingsDialog
          editor={editor}
          onClose={() => setShowFootnoteSettings(false)}
        />
      )}
      {showExportOptions && (
        <ExportOptionsDialog
          editor={editor}
          currentDoc={currentDoc}
          onExportDocx={async (_doc) => { await handleExport(); }}
          onClose={() => setShowExportOptions(false)}
        />
      )}
      {/* Round 13 dialogs */}
      {showDocInspector && (
        <DocInspectorDialog
          editor={editor}
          onClose={() => setShowDocInspector(false)}
        />
      )}
      {showCitations && (
        <CitationsDialog
          editor={editor}
          onClose={() => setShowCitations(false)}
        />
      )}
      {showIndex && (
        <IndexDialog
          editor={editor}
          onClose={() => setShowIndex(false)}
        />
      )}
      {showWordArt && (
        <WordArtDialog
          editor={editor}
          onClose={() => setShowWordArt(false)}
        />
      )}
      {showShapes && (
        <ShapesDialog
          editor={editor}
          onClose={() => setShowShapes(false)}
        />
      )}
      {/* Round 14 dialogs */}
      {showGridPaper && (
        <GridPaperDialog
          current={gridPaper}
          onApply={cfg => setGridPaper(cfg)}
          onClose={() => setShowGridPaper(false)}
        />
      )}
      {showTableAdvanced && (
        <TableAdvancedDialog
          editor={editor}
          onClose={() => setShowTableAdvanced(false)}
        />
      )}
      {showTextBox && (
        <TextBoxDialog
          editor={editor}
          onClose={() => setShowTextBox(false)}
        />
      )}
      {showTemplate && (
        <TemplateDialog
          editor={editor}
          onClose={() => setShowTemplate(false)}
        />
      )}
      {showBookFold && (
        <BookFoldDialog
          current={bookFold}
          onApply={cfg => setBookFold(cfg)}
          onClose={() => setShowBookFold(false)}
        />
      )}
      {showCalligraphy && (
        <CalligraphyDialog
          editor={editor}
          onClose={() => setShowCalligraphy(false)}
        />
      )}
      {/* Round 15 dialogs */}
      {showShortcuts && (
        <KeyboardShortcutsPanel
          onClose={() => setShowShortcuts(false)}
        />
      )}
      {showHighlight && (
        <HighlightPanel
          editor={editor}
          onClose={() => setShowHighlight(false)}
        />
      )}
      {showParaBorder && (
        <ParagraphBorderDialog
          editor={editor}
          onClose={() => setShowParaBorder(false)}
        />
      )}
      {showVersionHistory && (
        <VersionHistoryPanel
          editor={editor}
          onClose={() => setShowVersionHistory(false)}
        />
      )}
      {showMacro && (
        <MacroDialog
          editor={editor}
          onClose={() => setShowMacro(false)}
        />
      )}
      {showAppTheme && (
        <AppThemeDialog
          onClose={() => setShowAppTheme(false)}
        />
      )}
      {/* Round 16 dialogs */}
      {showPasteSettings && (
        <PasteSettingsDialog
          onClose={() => setShowPasteSettings(false)}
        />
      )}
      {showTableChart && (
        <TableChartDialog
          editor={editor}
          onClose={() => setShowTableChart(false)}
        />
      )}
      {showVideoEmbed && (
        <VideoEmbedDialog
          editor={editor}
          onClose={() => setShowVideoEmbed(false)}
        />
      )}
      {showAdvancedFind && (
        <AdvancedFindDialog
          editor={editor}
          onClose={() => setShowAdvancedFind(false)}
        />
      )}
      {showTTS && (
        <TextToSpeechPanel
          editor={editor}
          onClose={() => setShowTTS(false)}
        />
      )}
      {showDocStats && (
        <DocStatsDashboard
          editor={editor}
          onClose={() => setShowDocStats(false)}
        />
      )}
      {showGrammarLint && (
        <GrammarLintPanel
          editor={editor}
          onClose={() => setShowGrammarLint(false)}
        />
      )}
      {showCustomShortcuts && (
        <CustomShortcutsDialog
          onClose={() => setShowCustomShortcuts(false)}
        />
      )}
      {showCloudSync && (
        <CloudSyncDialog
          getContent={() => editor?.getJSON() ?? {}}
          onClose={() => setShowCloudSync(false)}
        />
      )}
      {/* Round 18 dialogs */}
      {showAIAdvisor && <AIAdvisorPanel editor={editor} onClose={() => setShowAIAdvisor(false)} />}
      {showTemplateGallery && (
        <TemplateGalleryDialog
          onClose={() => setShowTemplateGallery(false)}
          onApply={(html) => { editor?.chain().focus().setContent(html).run(); setShowTemplateGallery(false) }}
        />
      )}
      {showDocDiff && <DocDiffDialog editor={editor} onClose={() => setShowDocDiff(false)} />}
      {showFormFields && <FormFieldDialog editor={editor} onClose={() => setShowFormFields(false)} />}
      {/* Vibe Editing toggle button — fixed top-right */}
      <button
        onClick={() => setShowVibeEditing(v => !v)}
        title="Vibe Editing (AI 智能编辑)"
        style={{
          position: 'fixed',
          top: 8,
          right: showVibeEditing ? vibePanelWidth + 12 : 12,
          transition: 'right 0.2s ease, background 0.2s',
          zIndex: 1200,
          background: showVibeEditing
            ? 'linear-gradient(135deg, rgba(0,212,255,0.25), rgba(178,75,255,0.25))'
            : 'linear-gradient(135deg, #00d4ff, #b24bff)',
          border: showVibeEditing ? '1px solid rgba(0,212,255,0.5)' : 'none',
          borderRadius: 20,
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          padding: '5px 12px 5px 9px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          boxShadow: showVibeEditing ? 'none' : '0 2px 12px rgba(0,212,255,0.4)',
          transition: 'background 0.2s',
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 15 }}>✨</span> Vibe
      </button>
    </div>
  )
}

export default App
