/**
 * ShapesDialog — 形状绘制
 * 基础形状：矩形/圆形/三角形/箭头/线条/标注框
 * 支持填充色、边框、阴影、旋转、对齐、组合
 */
import React, { useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'

interface ShapesDialogProps {
  editor: Editor | null
  onClose: () => void
}

type ShapeType = 'rect' | 'circle' | 'triangle' | 'arrow-right' | 'arrow-left' | 'arrow-up' | 'arrow-down' | 'line' | 'star' | 'callout' | 'diamond' | 'pentagon' | 'hexagon' | 'parallelogram' | 'trapezoid'

interface ShapeConfig {
  id: ShapeType
  name: string
  svgPath?: string
  category: 'basic' | 'arrow' | 'block' | 'callout'
}

const SHAPES: ShapeConfig[] = [
  { id: 'rect', name: '矩形', category: 'basic' },
  { id: 'circle', name: '椭圆', category: 'basic' },
  { id: 'triangle', name: '三角形', category: 'basic' },
  { id: 'diamond', name: '菱形', category: 'basic' },
  { id: 'pentagon', name: '五边形', category: 'basic' },
  { id: 'hexagon', name: '六边形', category: 'basic' },
  { id: 'parallelogram', name: '平行四边形', category: 'basic' },
  { id: 'trapezoid', name: '梯形', category: 'basic' },
  { id: 'arrow-right', name: '右箭头', category: 'arrow' },
  { id: 'arrow-left', name: '左箭头', category: 'arrow' },
  { id: 'arrow-up', name: '上箭头', category: 'arrow' },
  { id: 'arrow-down', name: '下箭头', category: 'arrow' },
  { id: 'line', name: '直线', category: 'block' },
  { id: 'star', name: '五角星', category: 'basic' },
  { id: 'callout', name: '标注框', category: 'callout' },
]

const SHADOW_OPTIONS = [
  { label: '无', value: 'none' },
  { label: '小', value: '2px 2px 4px rgba(0,0,0,0.2)' },
  { label: '中', value: '4px 4px 8px rgba(0,0,0,0.3)' },
  { label: '大', value: '6px 6px 12px rgba(0,0,0,0.4)' },
]

function buildShapeSVG(shape: ShapeType, fill: string, stroke: string, strokeWidth: number, w: number, h: number): string {
  const sw = strokeWidth
  const sw2 = sw / 2

  switch (shape) {
    case 'rect':
      return `<rect x="${sw2}" y="${sw2}" width="${w - sw}" height="${h - sw}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" rx="2"/>`
    case 'circle':
      return `<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2 - sw2}" ry="${h/2 - sw2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    case 'triangle':
      return `<polygon points="${w/2},${sw2} ${w - sw2},${h - sw2} ${sw2},${h - sw2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    case 'diamond':
      return `<polygon points="${w/2},${sw2} ${w - sw2},${h/2} ${w/2},${h - sw2} ${sw2},${h/2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    case 'pentagon': {
      const cx = w/2, cy = h/2, r = Math.min(w, h)/2 - sw2
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = (i * 72 - 90) * Math.PI / 180
        return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
      }).join(' ')
      return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    }
    case 'hexagon': {
      const cx = w/2, cy = h/2, r = Math.min(w, h)/2 - sw2
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (i * 60 - 90) * Math.PI / 180
        return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
      }).join(' ')
      return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    }
    case 'star': {
      const cx = w/2, cy = h/2, ro = Math.min(w,h)/2 - sw2, ri = ro * 0.4
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = (i * 36 - 90) * Math.PI / 180
        const r2 = i % 2 === 0 ? ro : ri
        return `${cx + r2 * Math.cos(a)},${cy + r2 * Math.sin(a)}`
      }).join(' ')
      return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    }
    case 'arrow-right':
      return `<polygon points="${sw2},${h*.3} ${w*.65},${h*.3} ${w*.65},${sw2} ${w - sw2},${h/2} ${w*.65},${h - sw2} ${w*.65},${h*.7} ${sw2},${h*.7}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    case 'arrow-left':
      return `<polygon points="${w - sw2},${h*.3} ${w*.35},${h*.3} ${w*.35},${sw2} ${sw2},${h/2} ${w*.35},${h - sw2} ${w*.35},${h*.7} ${w - sw2},${h*.7}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    case 'arrow-up':
      return `<polygon points="${w*.3},${h - sw2} ${w*.3},${h*.35} ${sw2},${h*.35} ${w/2},${sw2} ${w - sw2},${h*.35} ${w*.7},${h*.35} ${w*.7},${h - sw2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    case 'arrow-down':
      return `<polygon points="${w*.3},${sw2} ${w*.3},${h*.65} ${sw2},${h*.65} ${w/2},${h - sw2} ${w - sw2},${h*.65} ${w*.7},${h*.65} ${w*.7},${sw2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    case 'parallelogram':
      return `<polygon points="${w*.2},${sw2} ${w - sw2},${sw2} ${w*.8},${h - sw2} ${sw2},${h - sw2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    case 'trapezoid':
      return `<polygon points="${w*.2},${sw2} ${w*.8},${sw2} ${w - sw2},${h - sw2} ${sw2},${h - sw2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    case 'line':
      return `<line x1="${sw2}" y1="${h/2}" x2="${w - sw2}" y2="${h/2}" stroke="${stroke}" stroke-width="${Math.max(sw, 2)}"/>`
    case 'callout':
      return `<path d="M${sw2},${sw2} H${w - sw2} V${h*.7} H${w*.4} L${w*.3},${h - sw2} L${w*.35},${h*.7} H${sw2} Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    default:
      return `<rect x="${sw2}" y="${sw2}" width="${w - sw}" height="${h - sw}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
  }
}

const SHAPE_LABELS_MAP: Record<string, string> = {
  basic: '基础形状', arrow: '箭头', block: '线条', callout: '标注'
}

const ShapesDialog: React.FC<ShapesDialogProps> = ({ editor, onClose }) => {
  const [selected, setSelected] = useState<ShapeType>('rect')
  const [fill, setFill] = useState('#3b82f6')
  const [stroke, setStroke] = useState('#1d4ed8')
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [width, setWidth] = useState(160)
  const [height, setHeight] = useState(100)
  const [shadow, setShadow] = useState('none')
  const [rotation, setRotation] = useState(0)
  const [shapeText, setShapeText] = useState('')
  const [textColor, setTextColor] = useState('#ffffff')
  const [fontSize, setFontSize] = useState(14)

  const insertShape = useCallback(() => {
    if (!editor) return
    const svgContent = buildShapeSVG(selected, fill, stroke, strokeWidth, width, height)
    const transformAttr = rotation !== 0 ? ` transform="rotate(${rotation} ${width/2} ${height/2})"` : ''
    const svgEl = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${svgContent}</svg>`

    const containerStyle = [
      `display:inline-block`,
      `position:relative`,
      `width:${width}px`,
      `height:${height}px`,
      shadow !== 'none' ? `filter:drop-shadow(${shadow.replace('box-shadow:', '')})` : '',
      rotation !== 0 ? `transform:rotate(${rotation}deg)` : '',
    ].filter(Boolean).join(';')

    const textOverlay = shapeText ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:${textColor};font-size:${fontSize}px;font-weight:500;text-align:center;pointer-events:none;white-space:nowrap;max-width:${width - 16}px;overflow:hidden;">${shapeText}</div>` : ''

    const html = `<span class="document-shape" contenteditable="false" style="${containerStyle}">${svgEl}${textOverlay}</span>`
    editor.chain().focus().insertContent(html).run()
    onClose()
  }, [editor, selected, fill, stroke, strokeWidth, width, height, shadow, rotation, shapeText, textColor, fontSize, onClose])

  const grouped = SHAPES.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = []
    acc[s.category].push(s)
    return acc
  }, {} as Record<string, ShapeConfig[]>)

  const previewSvg = buildShapeSVG(selected, fill, stroke, strokeWidth, 120, 80)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[650px] flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-base font-semibold">插入形状</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: shape picker */}
          <div className="w-48 border-r overflow-y-auto p-3 space-y-3">
            {Object.entries(grouped).map(([cat, shapes]) => (
              <div key={cat}>
                <div className="text-xs font-medium text-gray-500 mb-1">{SHAPE_LABELS_MAP[cat] || cat}</div>
                <div className="grid grid-cols-3 gap-1">
                  {shapes.map(s => (
                    <button
                      key={s.id}
                      className={`p-1 rounded border-2 flex flex-col items-center gap-0.5 transition-all ${selected === s.id ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-300'}`}
                      onClick={() => setSelected(s.id)}
                      title={s.name}
                    >
                      <svg width="28" height="20" viewBox={`0 0 28 20`}>
                        <g dangerouslySetInnerHTML={{ __html: buildShapeSVG(s.id, '#3b82f6', '#1d4ed8', 1.5, 28, 20) }} />
                      </svg>
                      <span className="text-xs text-gray-600 leading-tight" style={{ fontSize: 9 }}>{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Right: options */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Size */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">宽度</label>
                <input type="range" min="40" max="400" value={width}
                  onChange={e => setWidth(parseInt(e.target.value))} className="w-full" />
                <div className="text-xs text-center text-gray-400">{width}px</div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">高度</label>
                <input type="range" min="20" max="300" value={height}
                  onChange={e => setHeight(parseInt(e.target.value))} className="w-full" />
                <div className="text-xs text-center text-gray-400">{height}px</div>
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">填充色</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={fill} onChange={e => setFill(e.target.value)}
                    className="w-8 h-7 rounded border cursor-pointer" />
                  <input type="text" value={fill} onChange={e => setFill(e.target.value)}
                    className="flex-1 border rounded px-1 py-0.5 text-xs" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">边框色</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={stroke} onChange={e => setStroke(e.target.value)}
                    className="w-8 h-7 rounded border cursor-pointer" />
                  <input type="text" value={stroke} onChange={e => setStroke(e.target.value)}
                    className="flex-1 border rounded px-1 py-0.5 text-xs" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">边框宽度</label>
                <input type="number" min="0" max="10" value={strokeWidth}
                  onChange={e => setStrokeWidth(parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
              </div>
            </div>

            {/* Shadow & Rotation */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">阴影</label>
                <select className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  value={shadow} onChange={e => setShadow(e.target.value)}>
                  {SHADOW_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">旋转角度</label>
                <input type="range" min="-180" max="180" value={rotation}
                  onChange={e => setRotation(parseInt(e.target.value))} className="w-full" />
                <div className="text-xs text-center text-gray-400">{rotation}°</div>
              </div>
            </div>

            {/* Text inside shape */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">形状文字（可选）</label>
                <input type="text" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                  value={shapeText} onChange={e => setShapeText(e.target.value)}
                  placeholder="在形状内显示文字" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">文字颜色</label>
                <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
                  className="w-full h-8 rounded border cursor-pointer" />
              </div>
            </div>

            {/* Preview */}
            <div className="border rounded-lg bg-gray-50 p-3 flex items-center justify-center min-h-[100px]" style={{ overflow: 'hidden' }}>
              <div style={{ position: 'relative', width: 120, height: 80, filter: shadow !== 'none' ? 'drop-shadow(2px 2px 4px rgba(0,0,0,0.2))' : 'none', transform: rotation !== 0 ? `rotate(${rotation}deg)` : 'none' }}>
                <svg width={120} height={80} viewBox={`0 0 120 80`}>
                  <g dangerouslySetInnerHTML={{ __html: previewSvg }} />
                </svg>
                {shapeText && (
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: textColor, fontSize: Math.round(fontSize * 0.7), fontWeight: 500, textAlign: 'center', pointerEvents: 'none', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: 100 }}>
                    {shapeText}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t bg-gray-50">
          <button className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded border" onClick={onClose}>取消</button>
          <button className="px-6 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" onClick={insertShape}>
            插入形状
          </button>
        </div>
      </div>
    </div>
  )
}

export default ShapesDialog
