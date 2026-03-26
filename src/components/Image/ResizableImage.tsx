/**
 * ResizableImage — TipTap Node View for images with:
 * - 8 resize handles (corners + midpoints)
 * - Text wrap modes (inline / around / top-bottom / above / below)
 * - Alignment controls
 * - Brightness / contrast adjustments
 * - Image style presets
 * - Replace image button
 * - Optional caption
 */

import React, { useState, useRef, useCallback } from 'react'
import type { NodeViewProps } from '@tiptap/react'
import { NodeViewWrapper } from '@tiptap/react'
import { AlignLeft, AlignCenter, AlignRight, RefreshCw } from 'lucide-react'

type TextWrap = 'inline' | 'around' | 'topbottom' | 'above' | 'below'
type HandlePos = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const WRAP_LABELS: Record<TextWrap, string> = {
  inline: '嵌入型',
  around: '四周型',
  topbottom: '上下型',
  above: '浮于文字上方',
  below: '衬于文字下方',
}

const IMG_STYLES: { id: string; label: string; css: React.CSSProperties }[] = [
  { id: 'none', label: '无', css: {} },
  { id: 'shadow', label: '阴影', css: { boxShadow: '4px 4px 12px rgba(0,0,0,0.3)' } },
  { id: 'rounded', label: '圆角', css: { borderRadius: '12px' } },
  { id: 'border', label: '边框', css: { border: '3px solid #3b82f6', padding: '2px' } },
  { id: 'circle', label: '圆形', css: { borderRadius: '50%', overflow: 'hidden' } },
  { id: 'grayscale', label: '灰度', css: { filter: 'grayscale(1)' } },
]

const HANDLE_POSITIONS: Record<HandlePos, { top: string | number; left: string | number; cursor: string; xDir: number; yDir: number }> = {
  nw: { top: -5,      left: -5,      cursor: 'nw-resize', xDir: -1, yDir: -1 },
  n:  { top: -5,      left: '50%',   cursor: 'n-resize',  xDir:  0, yDir: -1 },
  ne: { top: -5,      left: '100%',  cursor: 'ne-resize', xDir:  1, yDir: -1 },
  e:  { top: '50%',   left: '100%',  cursor: 'e-resize',  xDir:  1, yDir:  0 },
  se: { top: '100%',  left: '100%',  cursor: 'se-resize', xDir:  1, yDir:  1 },
  s:  { top: '100%',  left: '50%',   cursor: 's-resize',  xDir:  0, yDir:  1 },
  sw: { top: '100%',  left: -5,      cursor: 'sw-resize', xDir: -1, yDir:  1 },
  w:  { top: '50%',   left: -5,      cursor: 'w-resize',  xDir: -1, yDir:  0 },
}

export const ResizableImageView: React.FC<NodeViewProps> = ({ node, updateAttributes, selected }) => {
  const { src, alt, title, width, align, caption, textWrap, brightness, contrast, imgStyle } = node.attrs as {
    src: string; alt: string; title: string
    width: number | string; align: 'left' | 'center' | 'right'
    caption: string; textWrap: TextWrap
    brightness: number; contrast: number; imgStyle: string
  }

  const [editingCaption, setEditingCaption] = useState(false)
  const [captionText, setCaptionText] = useState((caption as string) || '')
  const [showWrapMenu, setShowWrapMenu] = useState(false)
  const [showStyleMenu, setShowStyleMenu] = useState(false)
  const [showBrightness, setShowBrightness] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; startW: number; startH: number; handle: HandlePos } | null>(null)

  const currentW = typeof width === 'number' ? width : (imgRef.current?.naturalWidth ?? 400)

  const startResize = useCallback((e: React.MouseEvent, handle: HandlePos) => {
    e.preventDefault()
    e.stopPropagation()
    const el = imgRef.current
    const startW = el?.offsetWidth ?? currentW
    const startH = el?.offsetHeight ?? 300
    dragRef.current = { startX: e.clientX, startY: e.clientY, startW, startH, handle }

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const dx = ev.clientX - dragRef.current.startX
      const { xDir } = HANDLE_POSITIONS[dragRef.current.handle]
      const newW = Math.max(50, dragRef.current.startW + dx * xDir)
      updateAttributes({ width: Math.round(newW) })
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [currentW, updateAttributes])

  const handleCaptionBlur = () => {
    setEditingCaption(false)
    updateAttributes({ caption: captionText })
  }

  const handleReplaceImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => updateAttributes({ src: ev.target?.result as string })
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const wrap: TextWrap = (textWrap as TextWrap) || 'inline'
  const br = brightness ?? 100
  const ct = contrast ?? 100

  const wrapperStyle: React.CSSProperties = (() => {
    switch (wrap) {
      case 'around':
        return { float: align === 'right' ? 'right' : 'left', margin: '4px 8px', position: 'relative', userSelect: 'none' }
      case 'topbottom':
        return { display: 'block', clear: 'both', textAlign: align || 'left', margin: '8px 0', position: 'relative', userSelect: 'none' }
      case 'above':
        return { position: 'relative', zIndex: 10, display: 'inline-block', pointerEvents: 'none', userSelect: 'none' }
      case 'below':
        return { position: 'relative', zIndex: -1, display: 'inline-block', userSelect: 'none' }
      default: // inline
        return { display: 'block', textAlign: align || 'left', margin: align === 'center' ? '0 auto' : undefined, position: 'relative', userSelect: 'none' }
    }
  })()

  const stylePreset = IMG_STYLES.find(s => s.id === imgStyle)?.css ?? {}

  const imgComputedStyle: React.CSSProperties = {
    maxWidth: '100%',
    width: width ? `${width}px` : undefined,
    display: 'inline-block',
    outline: selected ? '2px solid #3b82f6' : 'none',
    borderRadius: '2px',
    cursor: 'default',
    verticalAlign: 'bottom',
    filter: (br !== 100 || ct !== 100) ? `brightness(${br}%) contrast(${ct}%)` : undefined,
    ...stylePreset,
  }

  return (
    <NodeViewWrapper style={wrapperStyle}>
      <div style={{ display: 'inline-block', position: 'relative' }}>
        <img ref={imgRef} src={src} alt={alt || ''} title={title || ''} style={imgComputedStyle} draggable={false} />

        {/* 8 resize handles */}
        {selected && Object.entries(HANDLE_POSITIONS).map(([pos, cfg]) => (
          <div
            key={pos}
            onMouseDown={(e) => startResize(e, pos as HandlePos)}
            style={{
              position: 'absolute',
              top: cfg.top,
              left: cfg.left,
              transform: 'translate(-50%, -50%)',
              width: 10,
              height: 10,
              background: '#3b82f6',
              border: '2px solid white',
              borderRadius: '2px',
              cursor: cfg.cursor,
              zIndex: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
          />
        ))}

        {/* Floating toolbar — shown when selected */}
        {selected && (
          <div
            style={{
              position: 'absolute',
              top: -42,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 2,
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
              padding: '3px 5px',
              zIndex: 30,
              whiteSpace: 'nowrap',
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Alignment */}
            {(['left', 'center', 'right'] as const).map((a) => (
              <button
                key={a}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); updateAttributes({ align: a }) }}
                style={{ width: 22, height: 22, border: 'none', borderRadius: 3, background: align === a ? '#eff6ff' : 'transparent', color: align === a ? '#3b82f6' : '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title={a === 'left' ? '左对齐' : a === 'center' ? '居中' : '右对齐'}
              >
                {a === 'left' && <AlignLeft size={11} />}
                {a === 'center' && <AlignCenter size={11} />}
                {a === 'right' && <AlignRight size={11} />}
              </button>
            ))}

            <div style={{ width: 1, background: '#e5e7eb', margin: '2px 1px' }} />

            {/* Text wrap dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setShowWrapMenu(!showWrapMenu); setShowStyleMenu(false); setShowBrightness(false) }}
                style={{ fontSize: 10, padding: '0 5px', height: 22, border: '1px solid #e5e7eb', borderRadius: 3, background: 'transparent', color: '#374151', cursor: 'pointer' }}
                title="文字环绕"
              >
                环绕 ▾
              </button>
              {showWrapMenu && (
                <div style={{ position: 'absolute', top: '100%', left: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 130, zIndex: 40 }}>
                  {(Object.entries(WRAP_LABELS) as [TextWrap, string][]).map(([wv, wl]) => (
                    <button
                      key={wv}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); updateAttributes({ textWrap: wv }); setShowWrapMenu(false) }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '4px 10px', fontSize: 12, background: wrap === wv ? '#eff6ff' : 'transparent', color: wrap === wv ? '#3b82f6' : '#374151', border: 'none', cursor: 'pointer' }}
                    >
                      {wrap === wv ? '✓ ' : '  '}{wl}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Style presets */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setShowStyleMenu(!showStyleMenu); setShowWrapMenu(false); setShowBrightness(false) }}
                style={{ fontSize: 10, padding: '0 5px', height: 22, border: '1px solid #e5e7eb', borderRadius: 3, background: 'transparent', color: '#374151', cursor: 'pointer' }}
                title="图片样式"
              >
                样式 ▾
              </button>
              {showStyleMenu && (
                <div style={{ position: 'absolute', top: '100%', left: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 100, zIndex: 40 }}>
                  {IMG_STYLES.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); updateAttributes({ imgStyle: s.id }); setShowStyleMenu(false) }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '4px 10px', fontSize: 12, background: imgStyle === s.id ? '#eff6ff' : 'transparent', color: imgStyle === s.id ? '#3b82f6' : '#374151', border: 'none', cursor: 'pointer' }}
                    >
                      {imgStyle === s.id ? '✓ ' : '  '}{s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Brightness/Contrast */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setShowBrightness(!showBrightness); setShowWrapMenu(false); setShowStyleMenu(false) }}
                style={{ fontSize: 10, padding: '0 5px', height: 22, border: '1px solid #e5e7eb', borderRadius: 3, background: 'transparent', color: '#374151', cursor: 'pointer' }}
                title="亮度/对比度"
              >
                调色 ▾
              </button>
              {showBrightness && (
                <div style={{ position: 'absolute', top: '100%', left: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '8px 12px', zIndex: 40, minWidth: 160 }}>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>亮度: {br}%</div>
                    <input type="range" min={10} max={200} value={br}
                      onMouseDown={(e) => e.stopPropagation()}
                      onChange={(e) => updateAttributes({ brightness: parseInt(e.target.value) })}
                      style={{ width: '100%', cursor: 'pointer' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>对比度: {ct}%</div>
                    <input type="range" min={10} max={200} value={ct}
                      onMouseDown={(e) => e.stopPropagation()}
                      onChange={(e) => updateAttributes({ contrast: parseInt(e.target.value) })}
                      style={{ width: '100%', cursor: 'pointer' }} />
                  </div>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); updateAttributes({ brightness: 100, contrast: 100 }) }}
                    style={{ marginTop: 6, fontSize: 11, padding: '2px 8px', border: '1px solid #e5e7eb', borderRadius: 3, background: 'transparent', cursor: 'pointer' }}
                  >重置</button>
                </div>
              )}
            </div>

            <div style={{ width: 1, background: '#e5e7eb', margin: '2px 1px' }} />

            {/* Replace image */}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); fileInputRef.current?.click() }}
              style={{ width: 22, height: 22, border: 'none', borderRadius: 3, background: 'transparent', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="替换图片"
            >
              <RefreshCw size={11} />
            </button>

            {/* Caption */}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setEditingCaption(true) }}
              style={{ fontSize: 10, padding: '0 4px', height: 22, border: 'none', borderRadius: 3, background: 'transparent', color: '#6b7280', cursor: 'pointer' }}
              title="添加图注"
            >图注</button>
          </div>
        )}

        {/* Hidden file input for replace */}
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleReplaceImage} />
      </div>

      {/* Caption area */}
      {(captionText || editingCaption) && (
        <div style={{ textAlign: align || 'left' }}>
          {editingCaption ? (
            <input
              autoFocus
              type="text"
              value={captionText}
              onChange={(e) => setCaptionText(e.target.value)}
              onBlur={handleCaptionBlur}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') handleCaptionBlur() }}
              style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic', border: '1px dashed #93c5fd', borderRadius: 2, padding: '1px 4px', outline: 'none', background: '#eff6ff', minWidth: 120 }}
              placeholder="输入图注..."
            />
          ) : (
            <span
              style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic', cursor: 'pointer' }}
              onDoubleClick={() => setEditingCaption(true)}
              title="双击编辑图注"
            >
              {captionText}
            </span>
          )}
        </div>
      )}
    </NodeViewWrapper>
  )
}
