/**
 * HorizontalRuler — WPS-style horizontal ruler above the A4 page.
 * - Scale in centimetres, calibrated to the actual rendered A4 width
 * - Gray zones = margins, white zone = printable area
 * - Triangle handles: left-indent, first-line-indent, right-indent
 * - Handles are DRAGGABLE to adjust current paragraph indentation
 */

import React, { useRef, useEffect, useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'

interface HorizontalRulerProps {
  editor: Editor | null
  marginCm?: number
  pageWidthMm?: number
}

const RULER_H = 22
const HANDLE_H = 8
const TICK_COLOR = '#888'
const MARGIN_BG = '#d1d5db'
const CONTENT_BG = '#ffffff'
const MM_PER_CM = 10
// Approximate px per em at base 14px font
const PX_PER_EM = 14

function cmToPx(cm: number, rulerPx: number, totalMm: number) {
  return (cm * MM_PER_CM / totalMm) * rulerPx
}

function pxToCm(px: number, rulerPx: number, totalMm: number) {
  return (px / rulerPx) * totalMm / MM_PER_CM
}

function downTriangle(cx: number, y: number, size: number) {
  return `M${cx - size},${y} L${cx + size},${y} L${cx},${y + size} Z`
}

type DragTarget = 'left' | 'firstLine' | 'right' | null

const HorizontalRuler: React.FC<HorizontalRulerProps> = ({
  editor,
  marginCm = 2.54,
  pageWidthMm = 210,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [rulerWidth, setRulerWidth] = useState(0)
  const dragRef = useRef<{ target: DragTarget; startX: number; startValue: number } | null>(null)

  useEffect(() => {
    const observe = () => {
      if (containerRef.current) setRulerWidth(containerRef.current.clientWidth)
    }
    observe()
    const ro = new ResizeObserver(observe)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const { firstLineIndentEm, leftIndentCm } = useEditorState({
    editor,
    selector: (ctx) => {
      const ed = ctx.editor
      if (!ed) return { firstLineIndentEm: 0, leftIndentCm: 0 }
      const attrs = ed.getAttributes('paragraph')
      return {
        firstLineIndentEm: (attrs.firstLineIndent as number) ?? 0,
        leftIndentCm: parseFloat((attrs.marginLeft as string) ?? '0') || 0,
      }
    },
  }) ?? { firstLineIndentEm: 0, leftIndentCm: 0 }

  const totalMm = pageWidthMm
  const marginPx = rulerWidth > 0 ? cmToPx(marginCm, rulerWidth, totalMm) : 0
  const contentWidthPx = rulerWidth - 2 * marginPx

  // Handle positions in ruler-px coordinates
  const leftHandlePx = marginPx + cmToPx(leftIndentCm, rulerWidth, totalMm)
  const rightHandlePx = rulerWidth - marginPx
  const firstLineOffsetPx = firstLineIndentEm * PX_PER_EM * (rulerWidth / (pageWidthMm * 3.78))
  const firstLinePx = leftHandlePx + Math.min(firstLineOffsetPx, contentWidthPx * 0.8)

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const startDrag = useCallback((e: React.MouseEvent, target: DragTarget) => {
    e.preventDefault()
    const startValue = target === 'left' ? leftIndentCm
      : target === 'firstLine' ? firstLineIndentEm
      : 0
    dragRef.current = { target, startX: e.clientX, startValue }

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current || rulerWidth === 0) return
      const dx = ev.clientX - dragRef.current.startX
      const dCm = pxToCm(dx, rulerWidth, totalMm)

      if (dragRef.current.target === 'left') {
        const newCm = Math.max(0, dragRef.current.startValue + dCm)
        editor?.chain().focus().updateAttributes('paragraph', {
          marginLeft: `${newCm.toFixed(2)}cm`,
        }).run()
      } else if (dragRef.current.target === 'firstLine') {
        const dEm = dx / PX_PER_EM
        const newEm = Math.max(0, dragRef.current.startValue + dEm)
        editor?.chain().focus().updateAttributes('paragraph', {
          firstLineIndent: Math.round(newEm * 10) / 10,
        }).run()
      }
    }

    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [editor, rulerWidth, totalMm, leftIndentCm, firstLineIndentEm])

  // ── Tick marks ────────────────────────────────────────────────────────────
  const ticks: React.ReactNode[] = []
  if (rulerWidth > 0) {
    for (let mm = 0; mm <= totalMm; mm += 5) {
      const x = (mm / totalMm) * rulerWidth
      const isMajor = mm % 10 === 0
      const tickH = isMajor ? 8 : 4
      const contentOffsetCm = mm / MM_PER_CM - marginCm
      const displayNum = Math.round(contentOffsetCm)

      ticks.push(
        <line key={`t${mm}`} x1={x} y1={RULER_H - tickH} x2={x} y2={RULER_H}
          stroke={TICK_COLOR} strokeWidth={0.7} />,
      )
      if (isMajor && displayNum !== 0) {
        ticks.push(
          <text key={`l${mm}`} x={x} y={RULER_H - 9} textAnchor="middle"
            fontSize={8} fill={TICK_COLOR} fontFamily="sans-serif">
            {Math.abs(displayNum)}
          </text>,
        )
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className="select-none flex-shrink-0 w-full"
      style={{ height: RULER_H + HANDLE_H, background: '#e5e7eb', cursor: 'default' }}
      title="水平标尺（拖动三角形把手调整缩进）"
    >
      {rulerWidth > 0 && (
        <svg ref={svgRef} width={rulerWidth} height={RULER_H + HANDLE_H} style={{ display: 'block' }}>
          {/* Background */}
          <rect x={0} y={0} width={marginPx} height={RULER_H} fill={MARGIN_BG} />
          <rect x={marginPx} y={0} width={contentWidthPx} height={RULER_H} fill={CONTENT_BG} />
          <rect x={marginPx + contentWidthPx} y={0} width={rulerWidth - marginPx - contentWidthPx} height={RULER_H} fill={MARGIN_BG} />
          <line x1={0} y1={RULER_H} x2={rulerWidth} y2={RULER_H} stroke="#d1d5db" strokeWidth={1} />

          {/* Ticks */}
          {ticks}

          {/* Margin guide lines */}
          <line x1={marginPx} y1={0} x2={marginPx} y2={RULER_H} stroke="#9ca3af" strokeWidth={1} strokeDasharray="2,2" />
          <line x1={marginPx + contentWidthPx} y1={0} x2={marginPx + contentWidthPx} y2={RULER_H}
            stroke="#9ca3af" strokeWidth={1} strokeDasharray="2,2" />

          {/* ── Left indent handle (draggable) ── */}
          <path
            d={downTriangle(leftHandlePx, RULER_H, HANDLE_H / 2)}
            fill="#3b82f6" opacity={0.85}
            style={{ cursor: 'ew-resize' }}
            onMouseDown={(e) => startDrag(e, 'left')}
          >
            <title>左缩进（拖拽调整）</title>
          </path>

          {/* ── First-line indent handle (draggable, only when set) ── */}
          {firstLineIndentEm > 0 && (
            <path
              d={downTriangle(firstLinePx, RULER_H, HANDLE_H / 2)}
              fill="#60a5fa" opacity={0.9}
              style={{ cursor: 'ew-resize' }}
              onMouseDown={(e) => startDrag(e, 'firstLine')}
            >
              <title>首行缩进（拖拽调整）</title>
            </path>
          )}

          {/* ── Right indent handle (static display) ── */}
          <path d={downTriangle(rightHandlePx, RULER_H, HANDLE_H / 2)} fill="#3b82f6" opacity={0.85}>
            <title>右缩进</title>
          </path>
        </svg>
      )}
    </div>
  )
}

export default HorizontalRuler

