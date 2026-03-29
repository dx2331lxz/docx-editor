/**
 * EditorCanvas — renders the A4 paper surface inside a scrollable grey area.
 * Supports: ruler, column layout, header/footer display, inline header/footer editing.
 */

import React, { useRef, useEffect } from 'react'
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

  // Word/WPS-style inter-page gap — handled by absolute-positioned dividers via useEffect
  // Compute page background style
  const pageBgStyle: React.CSSProperties = (() => {
    if (!pageBg || pageBg.type === 'none') return { background: 'white' }
    if (pageBg.type === 'solid') return { background: pageBg.color || '#ffffff' }
    if (pageBg.type === 'gradient1') return { background: `linear-gradient(135deg, ${pageBg.color || '#e8f4f8'} 0%, #ffffff 100%)` }
    if (pageBg.type === 'gradient2') return { background: `linear-gradient(to bottom, ${pageBg.color || '#fff9e6'} 0%, #ffffff 100%)` }
    return { background: 'white' }
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

  // ── Page divider lines (Word/WPS style gap between pages) ──────────────
  // Dynamically insert absolutely-positioned divider elements every 297mm
  // inside the a4-page container. These are pointer-events:none and sit
  // above content via z-index, creating a visible grey strip.
  useEffect(() => {
    const page = pageRef.current
    if (!page) return

    const PAGE_HEIGHT_MM = 297
    const MM_TO_PX = 3.7795275591 // 1mm in CSS pixels at 96dpi

    const updateDividers = () => {
      if (!page) return
      // Remove old dividers
      page.querySelectorAll('.page-gap-divider').forEach(el => el.remove())

      const totalHeight = page.scrollHeight
      const pageHeightPx = PAGE_HEIGHT_MM * MM_TO_PX

      let pos = pageHeightPx
      while (pos < totalHeight) {
        const divider = document.createElement('div')
        divider.className = 'page-gap-divider'
        divider.style.cssText = `
          position: absolute;
          left: 0;
          right: 0;
          top: ${pos}px;
          height: 20px;
          background: #c8c8c8;
          pointer-events: none;
          z-index: 50;
          user-select: none;
          box-shadow: 0 -2px 5px rgba(0,0,0,0.12), 0 2px 5px rgba(0,0,0,0.10),
                      -500px 0 0 #c8c8c8, 500px 0 0 #c8c8c8;
        `
        page.appendChild(divider)
        pos += pageHeightPx + 20 // next page starts 20px later
      }
    }

    // Run once and also on resize/content change
    updateDividers()
    const resizeObserver = new ResizeObserver(updateDividers)
    resizeObserver.observe(page)
    return () => resizeObserver.disconnect()
  }, [editor])

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
          className={`a4-page ${columnClass} ${themeClass}`}
          style={pageStyle ? {
            ...pageStyle,
            ...borderStyle,
            ...pageBgStyle,
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            margin: '0 auto',
            boxSizing: 'border-box',
            position: 'relative',
          } : { ...borderStyle, ...pageBgStyle, position: 'relative' }}
        >
          {/* ── Watermark layer ─────────────────────────────── */}
          {showWatermark && watermark?.type === 'text' && (
            <div style={{
              pointerEvents: 'none',
              userSelect: 'none',
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 0,
              overflow: 'hidden',
            }}>
              <span style={{
                fontFamily: watermark.fontFamily || 'sans-serif',
                fontSize: (watermark.fontSize || 72) + 'px',
                color: watermark.color || '#cccccc',
                opacity: watermark.opacity ?? 0.3,
                transform: `rotate(${-(watermark.angle ?? 45)}deg)`,
                whiteSpace: 'nowrap',
                fontWeight: 'bold',
              }}>
                {watermark.text || '水印'}
              </span>
            </div>
          )}
          {showWatermark && watermark?.type === 'image' && watermark.imageDataUrl && (
            <div style={{
              pointerEvents: 'none',
              userSelect: 'none',
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${watermark.imageDataUrl})`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              backgroundSize: '60%',
              opacity: watermark.imageOpacity ?? 0.3,
              zIndex: 0,
            }} />
          )}

          {/* ── Document grid overlay ───────────────────────── */}
          {docGrid?.showGrid && docGrid.mode !== 'none' && (
            <div
              className="doc-grid-overlay"
              style={{ '--grid-line-height': `${Math.round(297 * 3.7795 / docGrid.linesPerPage)}px` } as React.CSSProperties}
            />
          )}

          {/* ── Header zone (only when has content or editing) ── */}
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

          {/* ── Main content ────────────────────────────────── */}
          <div onClick={handleBodyClick} style={{ position: 'relative', zIndex: 1, writingMode: isVertical ? 'vertical-rl' : undefined }}>
            <EditorContent editor={editor} />
          </div>

          {/* ── Footer zone (only when has content or editing) ── */}
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
        <ContextMenu editor={editor} onInsertComment={onInsertComment} onTranslate={onTranslate} />
        <PasteOptionsPopup editor={editor} />
      </div>
    </div>
  )
}

export default EditorCanvas

