/**
 * EditorCanvas — renders the A4 paper surface inside a scrollable grey area.
 * Supports: ruler, column layout, header/footer display, inline header/footer editing.
 */

import React, { useRef, useEffect, useState } from 'react'
import { EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import ContextMenu from './ContextMenu'
import HorizontalRuler from '../Ruler/HorizontalRuler'
import type { PageConfig } from '../PageSetup/PageSetupDialog'
import { getPageStyle } from '../PageSetup/PageSetupDialog'
import { getBorderStyle } from '../PageBorder/PageBorderDialog'
import type { PageBorderConfig } from '../PageBorder/PageBorderDialog'
import type { WatermarkConfig } from '../Watermark/WatermarkDialog'
import type { DocGridConfig } from '../DocGrid/DocGridDialog'
import PasteOptionsPopup from '../PasteOptions/PasteOptionsPopup'

export type ColumnCount = 1 | 2 | 3 | 'left' | 'right'

interface EditorCanvasProps {
  editor: Editor | null
  showRuler?: boolean
  columns?: ColumnCount
  headerContent?: string
  footerContent?: string
  onEditHeader?: () => void
  onEditFooter?: () => void
  onHeaderChange?: (v: string) => void
  onFooterChange?: (v: string) => void
  headerFooterMode?: 'off' | 'header' | 'footer'
  onExitHeaderFooter?: () => void
  pageConfig?: PageConfig
  pageBorder?: PageBorderConfig
  watermark?: WatermarkConfig
  onInsertComment?: () => void
  readOnly?: boolean
  docGrid?: DocGridConfig
  isVertical?: boolean
  pageBg?: { type: string; color?: string }
  themeClass?: string
  onTranslate?: () => void
  onPageCountChange?: (totalPages: number) => void
}

/** Inline editable / display zone for header or footer */
const HeaderFooterZone: React.FC<{
  position: 'header' | 'footer'
  content: string
  editing: boolean
  onChange: (v: string) => void
  onActivate: () => void
  onDeactivate: () => void
}> = ({ position, content, editing, onChange, onActivate, onDeactivate }) => {
  const isHeader = position === 'header'

  const preview = content.replace(/#|\{page\}/g, '1')

  return (
    <div
      className={`header-footer-zone ${editing ? 'editing' : ''}`}
      style={{
        borderBottom: isHeader ? '1px dashed #93c5fd' : undefined,
        borderTop: !isHeader ? '1px dashed #93c5fd' : undefined,
        minHeight: '28px',
        padding: '4px 0',
        position: 'relative',
        cursor: editing ? 'text' : 'pointer',
        background: editing ? '#eff6ff' : 'transparent',
        transition: 'background 0.15s',
      }}
      onDoubleClick={onActivate}
    >
      <span
        style={{
          position: 'absolute',
          top: '2px',
          [isHeader ? 'left' : 'right']: 0,
          fontSize: '10px',
          color: '#93c5fd',
          fontFamily: 'sans-serif',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {isHeader ? '页眉' : '页脚'}
      </span>
      {editing ? (
        <div className="flex items-center gap-2 px-2">
          <input
            autoFocus
            type="text"
            value={content}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onDeactivate}
            onKeyDown={(e) => { if (e.key === 'Escape') onDeactivate() }}
            placeholder={`${isHeader ? '页眉' : '页脚'}内容（# = 页码，{date} = 日期）`}
            className="flex-1 text-sm text-gray-600 bg-transparent border-none outline-none"
            style={{ fontFamily: 'inherit' }}
          />
          <div className="flex gap-1 flex-shrink-0">
            <button
              type="button"
              className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 hover:bg-blue-200"
              onMouseDown={(e) => { e.preventDefault(); onChange(content + '#') }}
              title="插入页码"
            >#页码</button>
            <button
              type="button"
              className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 hover:bg-blue-200"
              onMouseDown={(e) => { e.preventDefault(); onChange(content + '{date}') }}
              title="插入日期"
            >日期</button>
          </div>
        </div>
      ) : (
        <div
          className="px-2 text-sm text-gray-500 italic min-h-[20px]"
          onClick={onActivate}
          title="双击编辑页眉/页脚"
        >
          {preview || <span className="text-gray-300 text-xs">（双击编辑{isHeader ? '页眉' : '页脚'}）</span>}
        </div>
      )}
    </div>
  )
}

const EditorCanvas: React.FC<EditorCanvasProps> = ({
  editor,
  showRuler = false,
  columns = 1,
  headerContent = '',
  footerContent = '',
  onHeaderChange,
  onFooterChange,
  onEditHeader,
  onEditFooter,
  headerFooterMode = 'off',
  onExitHeaderFooter,
  pageConfig,
  pageBorder,
  watermark,
  onInsertComment,
  readOnly = false,
  docGrid,
  isVertical = false,
  pageBg,
  themeClass = '',
  onTranslate,
  onPageCountChange,
}) => {
  const columnClass =
    columns === 2 ? 'columns-2' :
      columns === 3 ? 'columns-3' :
        columns === 'left' ? 'columns-left' :
          columns === 'right' ? 'columns-right' : ''
  const pageStyle = pageConfig ? getPageStyle(pageConfig) : undefined
  const borderStyle = pageBorder ? getBorderStyle(pageBorder) : {}
  const scrollRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  // Stable unique ID per editor instance — used to scope injected CSS rules
  const editorIdRef = useRef(`pg-${Math.random().toString(36).slice(2, 9)}`)
  const [numPages, setNumPages] = useState(1)

  // ── Page dimension constants ─────────────────────────────────────────
  const PAPER_SIZES_MM: Record<string, { w: number; h: number }> = {
    A4: { w: 210, h: 297 }, A3: { w: 297, h: 420 }, Letter: { w: 216, h: 279 },
  }
  const _paper = PAPER_SIZES_MM[pageConfig?.paperSize ?? 'A4'] ?? PAPER_SIZES_MM.A4
  const _isLandscape = pageConfig?.orientation === 'landscape'
  const PAGE_H_MM = _isLandscape ? _paper.w : _paper.h
  const MM_PX = 3.7795275591
  const CM_PX = MM_PX * 10
  const PAGE_PX = PAGE_H_MM * MM_PX
  // Printable content area per page (matches DOCX pagination exactly)
  const marginTop_px = (pageConfig?.marginTop ?? 2.54) * CM_PX
  const marginBottom_px = (pageConfig?.marginBottom ?? 2.54) * CM_PX
  const contentPerPage = Math.max(PAGE_PX - marginTop_px - marginBottom_px, 100)

  // Page background colour
  const pageColor = (() => {
    if (!pageBg || pageBg.type === 'none') return '#ffffff'
    if (pageBg.type === 'solid') return pageBg.color || '#ffffff'
    if (pageBg.type === 'gradient1') return pageBg.color || '#e8f4f8'
    if (pageBg.type === 'gradient2') return pageBg.color || '#fff9e6'
    return '#ffffff'
  })()

  // Watermark overlay (absolute positioned inside A4 page)
  const showWatermark = watermark && watermark.type !== 'none'

  const handleBodyClick = () => {
    if (headerFooterMode !== 'off') onExitHeaderFooter?.()
  }

  // Paragraph collapse: click the ::before triangle area of a heading
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const heading = target.closest('.ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4') as HTMLElement | null
      if (!heading) return
      // Only react when clicking the left margin area where ::before is rendered
      const rect = heading.getBoundingClientRect()
      if (e.clientX > rect.left) return // clicked inside heading text, not the triangle
      // Toggle collapsed
      const isCollapsed = heading.classList.toggle('collapsed')
      // Find all siblings until next same-or-higher heading
      const level = parseInt(heading.tagName[1])
      let sibling = heading.nextElementSibling as HTMLElement | null
      while (sibling) {
        const sibLevel = sibling.tagName.match(/^H(\d)$/i)
        if (sibLevel && parseInt(sibLevel[1]) <= level) break
        if (isCollapsed) {
          sibling.classList.add('para-collapsed')
        } else {
          sibling.classList.remove('para-collapsed')
        }
        sibling = sibling.nextElementSibling as HTMLElement | null
      }
    }
    container.addEventListener('click', handleClick)
    return () => container.removeEventListener('click', handleClick)
  }, [scrollRef])

  // ── Lightweight page-count calculation ─────────────────────────────────
  // No block-pushing — just measure content height and compute how many
  // logical pages it spans. Page divider lines are rendered as overlays.
  useEffect(() => {
    const page = pageRef.current
    if (!page) return

    const calcPages = () => {
      const pm = page.querySelector('.ProseMirror') as HTMLElement | null
      if (!pm) return
      // Subtract top+bottom padding (margins) to get the net content height,
      // then divide by content area per page — this matches DOCX pagination.
      const netHeight = Math.max(0, page.scrollHeight - marginTop_px - marginBottom_px)
      const pages = Math.max(1, Math.ceil(netHeight / contentPerPage))
      setNumPages(pages)
      if (onPageCountChange) onPageCountChange(pages)
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(calcPages, 120)
    }

    let mo: MutationObserver | null = null

    const tryAttach = () => {
      const pm = page.querySelector('.ProseMirror')
      if (!pm || mo) return

      mo = new MutationObserver((mutations) => {
        if (mutations.some(m => m.type === 'childList' || m.type === 'characterData'))
          schedule()
      })
      mo.observe(pm, { childList: true, subtree: true, characterData: true })
      editor?.on('update', schedule)
      schedule()
    }

    tryAttach()
    const t1 = setTimeout(tryAttach, 300)
    const t2 = setTimeout(tryAttach, 800)

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      clearTimeout(t1)
      clearTimeout(t2)
      mo?.disconnect()
      editor?.off('update', schedule)
    }
  }, [editor, pageConfig, onPageCountChange, contentPerPage, marginTop_px, marginBottom_px])

  return (
    <div className="glass-canvas-bg flex-1 overflow-auto bg-gray-300 flex flex-col">
      {/* ── Ruler ──────────────────────────────────────────── */}
      {showRuler && (
        <div className="glass-ruler flex-shrink-0 bg-gray-200 border-b border-gray-300">
          <div style={{ width: pageStyle?.width ?? '210mm', margin: '0 auto' }}>
            <HorizontalRuler editor={editor} marginCm={pageConfig?.marginLeft ?? 2.54} />
          </div>
        </div>
      )}

      {/* ── Scrollable page area ───────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-auto py-8 px-4">
        <div
          ref={pageRef}
          data-pgid={editorIdRef.current}
          data-page-px={Math.round(PAGE_PX)}
          data-content-per-page={Math.round(contentPerPage)}
          data-margin-top-px={Math.round(marginTop_px)}
          className={`a4-page ${columnClass} ${themeClass}`}
          style={{
            width: pageStyle?.width ?? '210mm',
            minHeight: `${PAGE_PX}px`,
            margin: '0 auto',
            position: 'relative',
            background: pageColor,
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            boxSizing: 'border-box',
            ...borderStyle,
          }}
        >
          {/* ── Page divider lines ────────────────────────── */}
          {/* Position = marginTop + (i+1) × contentPerPage, matching DOCX page breaks */}
          {numPages > 1 && Array.from({ length: numPages - 1 }).map((_, i) => (
            <div
              key={`divider-${i}`}
              className="page-divider-line"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: marginTop_px + (i + 1) * contentPerPage,
                height: 0,
                zIndex: 5,
                pointerEvents: 'none',
              }}
            >
              {/* Left margin dashed line */}
              <div style={{
                position: 'absolute',
                left: 0,
                width: `${pageConfig?.marginLeft ?? 2.54}cm`,
                top: 0,
                borderTop: '2px dashed #b0c4de',
                opacity: 0.7,
              }} />

              {/* Right margin dashed line */}
              <div style={{
                position: 'absolute',
                right: 0,
                width: `${pageConfig?.marginRight ?? 2.54}cm`,
                top: 0,
                borderTop: '2px dashed #b0c4de',
                opacity: 0.7,
              }} />

              {/* Page number badge (centered in right margin) */}
              <div style={{
                position: 'absolute',
                right: 4,
                top: -10,
                background: '#e8eef6',
                color: '#5a7399',
                fontSize: 10,
                fontFamily: 'system-ui, sans-serif',
                padding: '2px 6px',
                borderRadius: 4,
                fontWeight: 600,
                userSelect: 'none',
                letterSpacing: '0.5px',
                transform: 'scale(0.9)',
                transformOrigin: 'right center'
              }}>
                第 {i + 2} 页
              </div>
            </div>
          ))}

          {/* ── Watermark overlay (repeating for all pages) ── */}
          {showWatermark && watermark?.type === 'text' && (
            <div className="watermark-repeat" style={{
              pointerEvents: 'none',
              userSelect: 'none',
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              overflow: 'hidden',
              display: 'flex',
              flexWrap: 'wrap',
              alignContent: 'space-around',
              justifyContent: 'space-around',
              gap: `${PAGE_PX * 0.3}px 60px`,
              paddingTop: PAGE_PX * 0.15,
            }}>
              {Array.from({ length: numPages * 2 }).map((_, wi) => (
                <span key={wi} style={{
                  fontFamily: watermark.fontFamily || 'sans-serif',
                  fontSize: (watermark.fontSize || 72) + 'px',
                  color: watermark.color || '#cccccc',
                  opacity: watermark.opacity ?? 0.3,
                  transform: `rotate(${-(watermark.angle ?? 45)}deg)`,
                  whiteSpace: 'nowrap',
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}>
                  {watermark.text || '水印'}
                </span>
              ))}
            </div>
          )}
          {showWatermark && watermark?.type === 'image' && watermark.imageDataUrl && (
            <div style={{
              pointerEvents: 'none',
              userSelect: 'none',
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              backgroundImage: `url(${watermark.imageDataUrl})`,
              backgroundRepeat: 'repeat-y',
              backgroundPosition: 'center',
              backgroundSize: `60% ${PAGE_PX}px`,
              opacity: watermark.imageOpacity ?? 0.3,
            }} />
          )}

          {/* ── Document grid ──────────────────────────────── */}
          {docGrid?.showGrid && docGrid.mode !== 'none' && (
            <div
              className="doc-grid-overlay"
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 0,
                pointerEvents: 'none',
                '--grid-line-height': `${Math.round(PAGE_H_MM * 3.7795 / docGrid.linesPerPage)}px`,
              } as React.CSSProperties}
            />
          )}

          {/* ── Content layer ──────────────────────────────── */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              paddingTop: `${pageConfig?.marginTop ?? 2.54}cm`,
              paddingBottom: `${pageConfig?.marginBottom ?? 2.54}cm`,
              paddingLeft: `${pageConfig?.marginLeft ?? 2.54}cm`,
              paddingRight: `${pageConfig?.marginRight ?? 2.54}cm`,
              overflowX: 'hidden',
            }}
          >
            {/* Header zone */}
            {(headerContent || headerFooterMode === 'header') && (
              <HeaderFooterZone
                position="header"
                content={headerContent}
                editing={headerFooterMode === 'header'}
                onChange={(v) => onHeaderChange?.(v)}
                onActivate={() => onEditHeader?.()}
                onDeactivate={() => onExitHeaderFooter?.()}
              />
            )}

            {/* Main content */}
            <div onClick={handleBodyClick} style={{ writingMode: isVertical ? 'vertical-rl' : undefined }}>
              <EditorContent editor={editor} />
            </div>

            {/* Footer zone */}
            {(footerContent || headerFooterMode === 'footer') && (
              <HeaderFooterZone
                position="footer"
                content={footerContent}
                editing={headerFooterMode === 'footer'}
                onChange={(v) => onFooterChange?.(v)}
                onActivate={() => onEditFooter?.()}
                onDeactivate={() => onExitHeaderFooter?.()}
              />
            )}
          </div>
        </div>
        <ContextMenu editor={editor} onInsertComment={onInsertComment} onTranslate={onTranslate} />
        <PasteOptionsPopup editor={editor} />
      </div>
    </div>
  )
}

export default EditorCanvas

