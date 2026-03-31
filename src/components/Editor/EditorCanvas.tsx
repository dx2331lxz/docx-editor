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

  // ── Fixed-page constants ─────────────────────────────────────────────
  const PAPER_SIZES_MM: Record<string, { w: number; h: number }> = {
    A4: { w: 210, h: 297 }, A3: { w: 297, h: 420 }, Letter: { w: 216, h: 279 },
  }
  const _paper = PAPER_SIZES_MM[pageConfig?.paperSize ?? 'A4'] ?? PAPER_SIZES_MM.A4
  const _isLandscape = pageConfig?.orientation === 'landscape'
  const PAGE_H_MM = _isLandscape ? _paper.w : _paper.h
  const MM_PX = 3.7795275591
  const PAGE_PX = PAGE_H_MM * MM_PX
  const GAP_PX = 24
  const UNIT_PX = PAGE_PX + GAP_PX
  const PAGE_PADDING_TOP_PX = (pageConfig?.marginTop ?? 2.54) * 10 * MM_PX
  const PAGE_PADDING_BOTTOM_PX = (pageConfig?.marginBottom ?? 2.54) * 10 * MM_PX

  // Page background colour (used per page card)
  const pageColor = (() => {
    if (!pageBg || pageBg.type === 'none') return '#ffffff'
    if (pageBg.type === 'solid') return pageBg.color || '#ffffff'
    if (pageBg.type === 'gradient1') return pageBg.color || '#e8f4f8'
    if (pageBg.type === 'gradient2') return pageBg.color || '#fff9e6'
    return '#ffffff'
  })()

  // Total container height — always snaps to whole pages
  const totalHeight = numPages * PAGE_PX + Math.max(0, numPages - 1) * GAP_PX

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

  // ── Word-style page gap: push paragraphs out of grey bands ───────────
  // Background gradient is in pageBgStyle. Rather than setting inline styles
  // on ProseMirror's own DOM nodes (which PM resets on its next render cycle),
  // we inject a scoped <style> tag in <head>. PM never touches <head>, so
  // our margin rules survive indefinitely. MutationObserver on ProseMirror
  // fires on content changes (childList/characterData) but NOT on our own
  // style-tag mutations, preventing any infinite loop.
  useEffect(() => {
    const page = pageRef.current
    if (!page) return

    const styleId = `page-gap-${editorIdRef.current}`

    // Inject or reuse a scoped <style> tag
    const getStyleEl = (): HTMLStyleElement => {
      let el = document.getElementById(styleId) as HTMLStyleElement | null
      if (!el) {
        el = document.createElement('style')
        el.id = styleId
        document.head.appendChild(el)
      }
      return el
    }

    const pushBlocks = () => {
      const pm = page.querySelector('.ProseMirror') as HTMLElement | null
      if (!pm) { getStyleEl().textContent = ''; return }

      const getOffsetFromPage = (el: HTMLElement): number => {
        let top = 0
        let cur: HTMLElement | null = el
        while (cur && cur !== page) {
          top += cur.offsetTop
          cur = cur.offsetParent as HTMLElement | null
        }
        return top
      }

      const eid = editorIdRef.current

      // Build list of pushable targets with their CSS selectors.
      // UL/OL children that span > PAGE_PX can't be pushed as a whole;
      // instead we push their individual list items.
      type PushTarget = { el: HTMLElement; sel: string }
      const targets: PushTarget[] = []
        ; (Array.from(pm.children) as HTMLElement[]).forEach((pmChild, pi) => {
          const tag = pmChild.tagName
          if ((tag === 'UL' || tag === 'OL') && pmChild.offsetHeight > PAGE_PX) {
            ; (Array.from(pmChild.children) as HTMLElement[]).forEach((li, li_i) => {
              targets.push({
                el: li,
                sel: `[data-pgid="${eid}"] .ProseMirror > :nth-child(${pi + 1}) > :nth-child(${li_i + 1})`,
              })
            })
          } else {
            targets.push({
              el: pmChild,
              sel: `[data-pgid="${eid}"] .ProseMirror > :nth-child(${pi + 1})`,
            })
          }
        })

      // Clear previous rules so pass 1 reads natural (unpushed) positions.
      getStyleEl().textContent = ''

      // Accumulate push amounts across passes. Each pass reads positions
      // WITH already-accumulated CSS applied (forced reflow via offsetTop).
      // We only look for NEW straddlers (not already in the map).
      const pushMap = new Map<string, number>() // selector → push px

      for (let pass = 0; pass < 8; pass++) {
        let foundNew = false

        for (const { el, sel } of targets) {
          if (pushMap.has(sel)) continue  // already handled

          const topRel = getOffsetFromPage(el)
          const bottomRel = topRel + el.offsetHeight

          // Find which page this element starts on
          let pageStart = 0
          while (pageStart + UNIT_PX <= topRel) pageStart += UNIT_PX

          // Effective page bottom = page end minus bottom margin
          const effectiveBottom = pageStart + PAGE_PX - PAGE_PADDING_BOTTOM_PX
          const gapStart = pageStart + PAGE_PX
          const gapEnd = pageStart + UNIT_PX

          // Push if block crosses effective bottom boundary or starts in the gap zone
          const crossesBottom = topRel < gapStart && bottomRel > effectiveBottom
          const startsInGap = topRel >= gapStart && topRel < gapEnd

          if (crossesBottom || startsInGap) {
            const nextPageTop = pageStart + UNIT_PX + PAGE_PADDING_TOP_PX
            const push = nextPageTop - topRel
            if (push > 0) {
              pushMap.set(sel, push)
              foundNew = true
            }
          }
        }

        if (!foundNew) break  // layout is stable — no new straddlers

        const rules = Array.from(pushMap.entries()).map(
          ([sel, push]) => `${sel}{margin-top:${push}px!important}`
        )
        getStyleEl().textContent = rules.join('\n')
      }

      // ── Calculate page count from final layout ────────────────────
      let maxBottom = 0
      for (const { el } of targets) {
        const b = getOffsetFromPage(el) + el.offsetHeight
        if (b > maxBottom) maxBottom = b
      }
      let neededPages = 1
      if (maxBottom > PAGE_PX) {
        const idx = Math.floor(maxBottom / UNIT_PX)
        const rem = maxBottom - idx * UNIT_PX
        neededPages = rem > PAGE_PX ? idx + 2 : idx + 1
      }
      neededPages = Math.max(1, neededPages)
      setNumPages(neededPages)
      if (onPageCountChange) onPageCountChange(neededPages)
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(pushBlocks, 150)
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
      document.getElementById(styleId)?.remove()
    }
  }, [editor, pageConfig, onPageCountChange])

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
          className={columnClass}
          style={{
            width: pageStyle?.width ?? '210mm',
            height: totalHeight,
            margin: '0 auto',
            position: 'relative',
          }}
        >
          {/* ── Visual page cards (background + shadow per page) ── */}
          {Array.from({ length: numPages }).map((_, i) => (
            <div
              key={i}
              className={`page-card ${themeClass}`}
              style={{
                position: 'absolute',
                top: i * UNIT_PX,
                left: 0,
                right: 0,
                height: PAGE_PX,
                background: pageColor,
                boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                boxSizing: 'border-box',
                ...borderStyle,
              }}
            >
              {/* Watermark per page */}
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
              {/* Document grid overlay per page */}
              {docGrid?.showGrid && docGrid.mode !== 'none' && (
                <div
                  className="doc-grid-overlay"
                  style={{ '--grid-line-height': `${Math.round(PAGE_H_MM * 3.7795 / docGrid.linesPerPage)}px` } as React.CSSProperties}
                />
              )}
            </div>
          ))}

          {/* ── Content layer (on top of page cards) ───────── */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              paddingTop: `${pageConfig?.marginTop ?? 2.54}cm`,
              paddingLeft: `${pageConfig?.marginLeft ?? 2.54}cm`,
              paddingRight: `${pageConfig?.marginRight ?? 2.54}cm`,
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

