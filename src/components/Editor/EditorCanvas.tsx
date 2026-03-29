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
  // Stable unique ID per editor instance — used to scope injected CSS rules
  const editorIdRef = useRef(`pg-${Math.random().toString(36).slice(2, 9)}`)

  // Word-style page gap constants (shared between pageBgStyle and pushBlocks effect)
  const PAGE_MM  = 297
  const MM_PX    = 3.7795275591
  const PAGE_PX  = PAGE_MM * MM_PX   // ≈ 1122.52 px
  const GAP_PX   = 24
  const UNIT_PX  = PAGE_PX + GAP_PX

  // Page gap gradient: grey band every 297mm, white page content in between.
  // This is the FIRST background layer; the page color is the SECOND layer.
  // Because the gradient uses opaque colors, it fully overrides the second
  // layer in grey zones and lets white show through in page zones.
  const pageGapGradient = (pageColor: string) =>
    `repeating-linear-gradient(to bottom, ${pageColor} 0px, ${pageColor} ${PAGE_PX}px, #d4d4d4 ${PAGE_PX}px, #d4d4d4 ${UNIT_PX}px)`

  // Compute page background style
  const pageBgStyle: React.CSSProperties = (() => {
    if (!pageBg || pageBg.type === 'none') return { background: pageGapGradient('#ffffff') }
    if (pageBg.type === 'solid') return { background: pageGapGradient(pageBg.color || '#ffffff') }
    // For gradient backgrounds, fall back to simple colour for the page-gap gradient
    // (mixing two gradients in repeating-linear-gradient is not straightforward)
    if (pageBg.type === 'gradient1') return { background: pageGapGradient(pageBg.color || '#e8f4f8') }
    if (pageBg.type === 'gradient2') return { background: pageGapGradient(pageBg.color || '#fff9e6') }
    return { background: pageGapGradient('#ffffff') }
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
      ;(Array.from(pm.children) as HTMLElement[]).forEach((pmChild, pi) => {
        const tag = pmChild.tagName
        if ((tag === 'UL' || tag === 'OL') && pmChild.offsetHeight > PAGE_PX) {
          ;(Array.from(pmChild.children) as HTMLElement[]).forEach((li, li_i) => {
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

          const topRel    = getOffsetFromPage(el)
          const bottomRel = topRel + el.offsetHeight
          let boundary    = PAGE_PX
          while (boundary < topRel) boundary += UNIT_PX
          if (topRel < boundary && bottomRel > boundary) {
            const push = boundary + GAP_PX - topRel
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
  }, [editor, pageConfig])

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

