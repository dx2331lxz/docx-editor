/**
 * WordArtDialog — 艺术字增强
 * 20种预设样式，自定义填充/轮廓/阴影/3D/弯曲路径，实时预览
 */
import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'

interface WordArtDialogProps {
  editor: Editor | null
  onClose: () => void
}

interface WordArtStyle {
  id: string
  name: string
  fill: string
  stroke: string
  strokeWidth: number
  shadow: string
  gradient?: string
  borderRadius: number
  letterSpacing: number
  fontSize: number
  fontFamily: string
  fontWeight: string
  italic: boolean
  textTransform: 'none' | 'uppercase' | 'lowercase'
  transform?: string
  filter?: string
}

const PRESETS: WordArtStyle[] = [
  { id: 'p1', name: '经典红', fill: '#dc2626', stroke: '#991b1b', strokeWidth: 1, shadow: '2px 2px 4px rgba(0,0,0,0.3)', borderRadius: 0, letterSpacing: 2, fontSize: 36, fontFamily: 'serif', fontWeight: '700', italic: false, textTransform: 'none' },
  { id: 'p2', name: '渐变金', fill: 'transparent', stroke: '#92400e', strokeWidth: 1, shadow: '1px 1px 2px #78350f', gradient: 'linear-gradient(135deg, #f59e0b, #dc2626)', borderRadius: 0, letterSpacing: 3, fontSize: 36, fontFamily: 'serif', fontWeight: '900', italic: false, textTransform: 'none' },
  { id: 'p3', name: '深邃蓝', fill: '#1d4ed8', stroke: '#1e3a8a', strokeWidth: 2, shadow: '3px 3px 6px rgba(0,0,0,0.4)', borderRadius: 0, letterSpacing: 1, fontSize: 36, fontFamily: 'sans-serif', fontWeight: '800', italic: false, textTransform: 'uppercase' },
  { id: 'p4', name: '霓虹绿', fill: '#10b981', stroke: '#059669', strokeWidth: 1, shadow: '0 0 10px #34d399, 0 0 20px #10b981', borderRadius: 0, letterSpacing: 2, fontSize: 36, fontFamily: 'monospace', fontWeight: '700', italic: false, textTransform: 'none' },
  { id: 'p5', name: '渐变彩', fill: 'transparent', stroke: 'none', strokeWidth: 0, shadow: '2px 2px 4px rgba(0,0,0,0.2)', gradient: 'linear-gradient(90deg, #ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6)', borderRadius: 0, letterSpacing: 2, fontSize: 36, fontFamily: 'sans-serif', fontWeight: '900', italic: false, textTransform: 'none' },
  { id: 'p6', name: '优雅紫', fill: '#7c3aed', stroke: '#5b21b6', strokeWidth: 1, shadow: '2px 2px 8px rgba(109,40,217,0.5)', borderRadius: 0, letterSpacing: 3, fontSize: 36, fontFamily: 'cursive', fontWeight: '700', italic: true, textTransform: 'none' },
  { id: 'p7', name: '科技感', fill: '#0f172a', stroke: '#38bdf8', strokeWidth: 2, shadow: '0 0 8px #38bdf8', borderRadius: 0, letterSpacing: 4, fontSize: 36, fontFamily: 'monospace', fontWeight: '700', italic: false, textTransform: 'uppercase', filter: 'drop-shadow(0 0 4px #38bdf8)' },
  { id: 'p8', name: '复古棕', fill: '#78350f', stroke: '#451a03', strokeWidth: 1, shadow: '2px 2px 0 #fef3c7, 4px 4px 0 #d97706', borderRadius: 0, letterSpacing: 1, fontSize: 36, fontFamily: 'Georgia, serif', fontWeight: '700', italic: false, textTransform: 'none' },
  { id: 'p9', name: '玫瑰金', fill: 'transparent', stroke: '#be185d', strokeWidth: 1, gradient: 'linear-gradient(135deg, #f43f5e, #ec4899, #a21caf)', shadow: '1px 1px 3px rgba(0,0,0,0.3)', borderRadius: 0, letterSpacing: 2, fontSize: 36, fontFamily: 'serif', fontWeight: '700', italic: true, textTransform: 'none' },
  { id: 'p10', name: '立体灰', fill: '#4b5563', stroke: '#1f2937', strokeWidth: 1, shadow: '1px 1px 0 #9ca3af, 2px 2px 0 #6b7280, 3px 3px 0 #4b5563', borderRadius: 0, letterSpacing: 2, fontSize: 36, fontFamily: 'sans-serif', fontWeight: '900', italic: false, textTransform: 'none' },
  { id: 'p11', name: '霓虹橙', fill: '#ea580c', stroke: '#9a3412', strokeWidth: 0, shadow: '0 0 7px #fb923c, 0 0 14px #ea580c, 0 0 21px #c2410c', borderRadius: 0, letterSpacing: 2, fontSize: 36, fontFamily: 'sans-serif', fontWeight: '800', italic: false, textTransform: 'none' },
  { id: 'p12', name: '冰蓝', fill: 'transparent', stroke: '#0ea5e9', strokeWidth: 1, gradient: 'linear-gradient(180deg, #e0f2fe, #0284c7)', shadow: '0 2px 8px rgba(14,165,233,0.4)', borderRadius: 0, letterSpacing: 3, fontSize: 36, fontFamily: 'sans-serif', fontWeight: '700', italic: false, textTransform: 'none' },
  { id: 'p13', name: '黑金', fill: '#111827', stroke: '#f59e0b', strokeWidth: 2, shadow: '2px 2px 4px rgba(0,0,0,0.5)', borderRadius: 0, letterSpacing: 4, fontSize: 36, fontFamily: 'serif', fontWeight: '700', italic: false, textTransform: 'uppercase' },
  { id: 'p14', name: '彩虹斜', fill: 'transparent', stroke: 'none', strokeWidth: 0, gradient: 'linear-gradient(45deg, #ef4444 0%, #f97316 25%, #eab308 50%, #22c55e 75%, #3b82f6 100%)', shadow: '2px 2px 4px rgba(0,0,0,0.2)', borderRadius: 0, letterSpacing: 1, fontSize: 36, fontFamily: 'sans-serif', fontWeight: '900', italic: true, textTransform: 'none' },
  { id: 'p15', name: '描边白', fill: 'white', stroke: '#1f2937', strokeWidth: 3, shadow: '3px 3px 0 #374151', borderRadius: 0, letterSpacing: 2, fontSize: 36, fontFamily: 'sans-serif', fontWeight: '900', italic: false, textTransform: 'none' },
  { id: 'p16', name: '柔和粉', fill: '#f9a8d4', stroke: '#db2777', strokeWidth: 1, shadow: '2px 2px 6px rgba(219,39,119,0.3)', borderRadius: 0, letterSpacing: 2, fontSize: 36, fontFamily: 'cursive', fontWeight: '700', italic: true, textTransform: 'none' },
  { id: 'p17', name: '墨绿', fill: '#065f46', stroke: '#022c22', strokeWidth: 1, shadow: '2px 2px 4px rgba(0,0,0,0.4)', borderRadius: 0, letterSpacing: 1, fontSize: 36, fontFamily: 'Georgia, serif', fontWeight: '700', italic: false, textTransform: 'none' },
  { id: 'p18', name: '火焰', fill: 'transparent', stroke: '#dc2626', strokeWidth: 1, gradient: 'linear-gradient(180deg, #fef08a 0%, #f97316 40%, #dc2626 100%)', shadow: '0 2px 10px rgba(220,38,38,0.5)', borderRadius: 0, letterSpacing: 2, fontSize: 36, fontFamily: 'sans-serif', fontWeight: '900', italic: false, textTransform: 'none' },
  { id: 'p19', name: '深色3D', fill: '#1e293b', stroke: '#475569', strokeWidth: 1, shadow: '2px 2px 0 #64748b, 4px 4px 0 #475569, 6px 6px 0 #334155', borderRadius: 0, letterSpacing: 2, fontSize: 36, fontFamily: 'sans-serif', fontWeight: '800', italic: false, textTransform: 'none' },
  { id: 'p20', name: '银灰渐变', fill: 'transparent', stroke: '#6b7280', strokeWidth: 1, gradient: 'linear-gradient(135deg, #f3f4f6, #9ca3af, #f3f4f6)', shadow: '1px 1px 3px rgba(0,0,0,0.3)', borderRadius: 0, letterSpacing: 3, fontSize: 36, fontFamily: 'serif', fontWeight: '700', italic: false, textTransform: 'none' },
]

type CurvePath = 'none' | 'arch' | 'wave' | 'circle' | 'slant'

function getTransformStyle(curve: CurvePath): string {
  switch (curve) {
    case 'arch': return 'skewX(-5deg)'
    case 'wave': return 'scaleY(1.05)'
    case 'slant': return 'skewX(-15deg)'
    default: return 'none'
  }
}

const WordArtDialog: React.FC<WordArtDialogProps> = ({ editor, onClose }) => {
  const [text, setText] = useState('艺术字')
  const [selected, setSelected] = useState<WordArtStyle>(PRESETS[0])
  const [curve, setCurve] = useState<CurvePath>('none')

  // Custom overrides
  const [customFill, setCustomFill] = useState(PRESETS[0].fill)
  const [customFontSize, setCustomFontSize] = useState(PRESETS[0].fontSize)
  const [customLetterSpacing, setCustomLetterSpacing] = useState(PRESETS[0].letterSpacing)

  const applyPreset = (p: WordArtStyle) => {
    setSelected(p)
    setCustomFill(p.fill)
    setCustomFontSize(p.fontSize)
    setCustomLetterSpacing(p.letterSpacing)
  }

  const previewStyle: React.CSSProperties = {
    color: customFill || selected.fill,
    WebkitTextStroke: selected.stroke !== 'none' ? `${selected.strokeWidth}px ${selected.stroke}` : undefined,
    textShadow: selected.shadow,
    fontSize: customFontSize,
    fontFamily: selected.fontFamily,
    fontWeight: selected.fontWeight as React.CSSProperties['fontWeight'],
    fontStyle: selected.italic ? 'italic' : 'normal',
    textTransform: selected.textTransform,
    letterSpacing: customLetterSpacing,
    backgroundImage: selected.gradient ? selected.gradient : undefined,
    WebkitBackgroundClip: selected.gradient ? 'text' : undefined,
    WebkitTextFillColor: selected.gradient ? 'transparent' : undefined,
    filter: selected.filter,
    transform: getTransformStyle(curve),
    display: 'inline-block',
    padding: '8px 16px',
  }

  const insertWordArt = () => {
    if (!editor || !text.trim()) return

    const style = [
      `color:${customFill || selected.fill}`,
      selected.stroke !== 'none' ? `-webkit-text-stroke:${selected.strokeWidth}px ${selected.stroke}` : '',
      `text-shadow:${selected.shadow}`,
      `font-size:${customFontSize}px`,
      `font-family:${selected.fontFamily}`,
      `font-weight:${selected.fontWeight}`,
      selected.italic ? 'font-style:italic' : '',
      `text-transform:${selected.textTransform}`,
      `letter-spacing:${customLetterSpacing}px`,
      selected.gradient ? `background-image:${selected.gradient};-webkit-background-clip:text;-webkit-text-fill-color:transparent` : '',
      selected.filter ? `filter:${selected.filter}` : '',
      `transform:${getTransformStyle(curve)}`,
      'display:inline-block',
      'cursor:default',
    ].filter(Boolean).join(';')

    const html = `<span class="word-art" style="${style}" contenteditable="false">${text}</span>`
    editor.chain().focus().insertContent(html).run()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[680px] flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-base font-semibold">艺术字</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="flex flex-col gap-4 p-5 overflow-y-auto flex-1">
          {/* Text input */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">艺术字文本</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="输入文字..."
            />
          </div>

          {/* Presets grid */}
          <div>
            <div className="text-xs text-gray-500 mb-2">预设样式（20种）</div>
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
              {PRESETS.map(p => {
                const ps: React.CSSProperties = {
                  color: p.fill,
                  WebkitTextStroke: p.stroke !== 'none' ? `${p.strokeWidth}px ${p.stroke}` : undefined,
                  textShadow: p.shadow,
                  fontFamily: p.fontFamily,
                  fontWeight: p.fontWeight as React.CSSProperties['fontWeight'],
                  fontStyle: p.italic ? 'italic' : 'normal',
                  backgroundImage: p.gradient || undefined,
                  WebkitBackgroundClip: p.gradient ? 'text' : undefined,
                  WebkitTextFillColor: p.gradient ? 'transparent' : undefined,
                  fontSize: 16,
                }
                return (
                  <button
                    key={p.id}
                    className={`h-12 rounded-lg border-2 text-base flex items-center justify-center transition-all ${selected.id === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                    onClick={() => applyPreset(p)}
                    title={p.name}
                    style={{ overflow: 'hidden' }}
                  >
                    <span style={ps}>{p.name.length > 3 ? p.name.slice(0, 3) : p.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom options */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">字号</label>
              <input type="range" min="20" max="72" step="2" value={customFontSize}
                onChange={e => setCustomFontSize(parseInt(e.target.value))}
                className="w-full" />
              <div className="text-xs text-center text-gray-400">{customFontSize}px</div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">字间距</label>
              <input type="range" min="0" max="20" step="1" value={customLetterSpacing}
                onChange={e => setCustomLetterSpacing(parseInt(e.target.value))}
                className="w-full" />
              <div className="text-xs text-center text-gray-400">{customLetterSpacing}px</div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">弯曲效果</label>
              <select className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                value={curve} onChange={e => setCurve(e.target.value as CurvePath)}>
                <option value="none">无</option>
                <option value="arch">拱形</option>
                <option value="slant">倾斜</option>
                <option value="wave">拉伸</option>
              </select>
            </div>
          </div>

          {/* Preview */}
          <div className="border rounded-lg bg-gray-50 p-4 text-center min-h-[100px] flex items-center justify-center overflow-hidden">
            <span style={previewStyle}>{text || '艺术字预览'}</span>
          </div>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t bg-gray-50">
          <button className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded border"
            onClick={onClose}>取消</button>
          <button
            className="px-6 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            onClick={insertWordArt}
            disabled={!text.trim()}
          >
            插入艺术字
          </button>
        </div>
      </div>
    </div>
  )
}

export default WordArtDialog
