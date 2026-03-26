/**
 * CalligraphyDialog — 书法字帖生成
 * 支持：米字格 / 田字格 / 回宫格
 * 设置练习字、字号、重复次数，生成可打印的字帖
 */
import React, { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'

interface CalligraphyDialogProps {
  editor: Editor | null
  onClose: () => void
}

type GridType = 'mizi' | 'tian' | 'huigong' | 'jingzi'

interface CalligraphyConfig {
  gridType: GridType
  chars: string
  cellSize: number
  cols: number
  rows: number
  gridColor: string
  guideColor: string
  guideOpacity: number
  showGuideline: boolean
}

const GRID_NAMES: Record<GridType, string> = {
  mizi: '米字格',
  tian: '田字格',
  huigong: '回宫格',
  jingzi: '井字格',
}

const GRID_ICONS: Record<GridType, string> = {
  mizi: '米',
  tian: '田',
  huigong: '回',
  jingzi: '井',
}

/** Draw a single cell on canvas */
function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number,
  type: GridType,
  lineColor: string,
  guideColor: string,
  guideOpacity: number,
  showGuide: boolean,
  char?: string,
  guideChar?: string
) {
  const s = size

  // Outer border
  ctx.strokeStyle = lineColor
  ctx.lineWidth = 1.5
  ctx.strokeRect(x, y, s, s)

  // Inner guide lines
  if (showGuide) {
    ctx.save()
    ctx.globalAlpha = guideOpacity
    ctx.strokeStyle = guideColor
    ctx.lineWidth = 0.7

    if (type === 'tian' || type === 'huigong' || type === 'mizi' || type === 'jingzi') {
      // Vertical center
      ctx.beginPath(); ctx.moveTo(x + s / 2, y); ctx.lineTo(x + s / 2, y + s); ctx.stroke()
      // Horizontal center
      ctx.beginPath(); ctx.moveTo(x, y + s / 2); ctx.lineTo(x + s, y + s / 2); ctx.stroke()
    }

    if (type === 'mizi') {
      // Diagonal lines
      ctx.setLineDash([2, 2])
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s, y + s); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x + s, y); ctx.lineTo(x, y + s); ctx.stroke()
      ctx.setLineDash([])
    }

    if (type === 'huigong') {
      // Inner border (回 shape)
      const m = s * 0.2
      ctx.strokeRect(x + m, y + m, s - m * 2, s - m * 2)
    }

    if (type === 'jingzi') {
      // 2 vertical + 2 horizontal = 9 cells
      ctx.beginPath(); ctx.moveTo(x + s / 3, y); ctx.lineTo(x + s / 3, y + s); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x + s * 2 / 3, y); ctx.lineTo(x + s * 2 / 3, y + s); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x, y + s / 3); ctx.lineTo(x + s, y + s / 3); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x, y + s * 2 / 3); ctx.lineTo(x + s, y + s * 2 / 3); ctx.stroke()
    }

    ctx.restore()
  }

  // Guide character (faint)
  if (guideChar) {
    ctx.save()
    ctx.globalAlpha = 0.12
    ctx.fillStyle = '#374151'
    ctx.font = `${s * 0.85}px "STKaiti", "KaiTi", "楷体", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(guideChar, x + s / 2, y + s / 2)
    ctx.restore()
  }

  // Practice character
  if (char) {
    ctx.save()
    ctx.fillStyle = '#111827'
    ctx.font = `bold ${s * 0.85}px "STKaiti", "KaiTi", "楷体", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(char, x + s / 2, y + s / 2)
    ctx.restore()
  }
}

const CalligraphyDialog: React.FC<CalligraphyDialogProps> = ({ editor, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cfg, setCfg] = useState<CalligraphyConfig>({
    gridType: 'mizi',
    chars: '永字八法',
    cellSize: 60,
    cols: 8,
    rows: 6,
    gridColor: '#6b7280',
    guideColor: '#ef4444',
    guideOpacity: 0.4,
    showGuideline: true,
  })

  const [showExample, setShowExample] = useState(true)
  const [exampleRepeat, setExampleRepeat] = useState(1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { cellSize: cs, cols, rows, gridType, gridColor, guideColor, guideOpacity, showGuideline, chars } = cfg

    const totalW = cols * cs + 2
    const totalH = rows * cs + 2
    canvas.width = totalW
    canvas.height = totalH
    canvas.style.width = `${Math.min(totalW, 480)}px`
    canvas.style.height = `${Math.min(totalW, 480) / totalW * totalH}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fffef7'
    ctx.fillRect(0, 0, totalW, totalH)

    const charList = chars.replace(/\s/g, '').split('')
    let charIdx = 0

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cs + 1
        const y = r * cs + 1

        let printChar: string | undefined
        let guideChar: string | undefined

        if (charList.length > 0 && showExample) {
          const ci = charIdx % charList.length
          // First exampleRepeat columns: show example
          if (c < exampleRepeat) {
            printChar = charList[ci % charList.length]
            // Count which practice cell this is
          } else {
            guideChar = charList[ci % charList.length]
          }
          if (c === cols - 1) charIdx++
        }

        drawCell(ctx, x, y, cs, gridType, gridColor, guideColor, guideOpacity, showGuideline, printChar, guideChar)
      }
    }
  }, [cfg, showExample, exampleRepeat])

  const insertIntoDoc = () => {
    if (!editor) return
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const html = `<figure class="calligraphy-sheet" style="margin:16px 0;">
      <img src="${dataUrl}" style="max-width:100%;border:1px solid #e5e7eb;" alt="书法字帖" />
      <figcaption style="text-align:center;font-size:11px;color:#9ca3af;margin-top:4px;">${GRID_NAMES[cfg.gridType]} · 练习字：${cfg.chars}</figcaption>
    </figure>`
    editor.chain().focus().insertContent(html).run()
    onClose()
  }

  const printSheet = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<html><head><title>书法字帖</title><style>body{margin:0;display:flex;flex-direction:column;align-items:center;padding:20px;}img{max-width:100%;} @media print{body{padding:0;}}</style></head><body><h3 style="font-family:serif;">${GRID_NAMES[cfg.gridType]} 练习字：${cfg.chars}</h3><img src="${dataUrl}"/><script>window.print();window.close();</script></body></html>`)
    w.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[720px] flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-base font-semibold">书法字帖</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: settings */}
          <div className="w-56 border-r overflow-y-auto p-4 space-y-4 flex-shrink-0">
            {/* Grid type */}
            <div>
              <div className="text-xs text-gray-500 mb-2">格式类型</div>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.entries(GRID_NAMES) as [GridType, string][]).map(([v, label]) => (
                  <button key={v}
                    className={`py-2 text-sm rounded border-2 transition-all ${cfg.gridType === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300'}`}
                    onClick={() => setCfg(c => ({ ...c, gridType: v }))}>
                    <div className="text-base">{GRID_ICONS[v]}</div>
                    <div className="text-xs">{label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Characters */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">练习字</label>
              <input type="text" value={cfg.chars}
                onChange={e => setCfg(c => ({ ...c, chars: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                placeholder="输入要练习的汉字" />
            </div>

            {/* Grid layout */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">列数</label>
                <input type="number" min="2" max="20" value={cfg.cols}
                  onChange={e => setCfg(c => ({ ...c, cols: parseInt(e.target.value) || 8 }))}
                  className="w-full border border-gray-300 rounded px-1 py-1 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">行数</label>
                <input type="number" min="2" max="20" value={cfg.rows}
                  onChange={e => setCfg(c => ({ ...c, rows: parseInt(e.target.value) || 6 }))}
                  className="w-full border border-gray-300 rounded px-1 py-1 text-sm" />
              </div>
            </div>

            {/* Cell size */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">格子大小 ({cfg.cellSize}px)</label>
              <input type="range" min="30" max="120" value={cfg.cellSize}
                onChange={e => setCfg(c => ({ ...c, cellSize: parseInt(e.target.value) }))}
                className="w-full" />
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">格线色</label>
                <input type="color" value={cfg.gridColor}
                  onChange={e => setCfg(c => ({ ...c, gridColor: e.target.value }))}
                  className="w-full h-7 rounded border cursor-pointer" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">辅助线色</label>
                <input type="color" value={cfg.guideColor}
                  onChange={e => setCfg(c => ({ ...c, guideColor: e.target.value }))}
                  className="w-full h-7 rounded border cursor-pointer" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">辅助线透明度 ({Math.round(cfg.guideOpacity * 100)}%)</label>
              <input type="range" min="0.1" max="0.9" step="0.05" value={cfg.guideOpacity}
                onChange={e => setCfg(c => ({ ...c, guideOpacity: parseFloat(e.target.value) }))}
                className="w-full" />
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={cfg.showGuideline}
                onChange={e => setCfg(c => ({ ...c, showGuideline: e.target.checked }))} />
              显示辅助线
            </label>

            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={showExample}
                onChange={e => setShowExample(e.target.checked)} />
              显示范例字
            </label>

            {showExample && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">范例重复列数</label>
                <input type="number" min="1" max="4" value={exampleRepeat}
                  onChange={e => setExampleRepeat(parseInt(e.target.value) || 1)}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
              </div>
            )}
          </div>

          {/* Right: canvas preview */}
          <div className="flex-1 overflow-auto p-4">
            <div className="text-xs text-gray-500 mb-2">字帖预览</div>
            <div className="overflow-auto border rounded bg-amber-50 p-2">
              <canvas ref={canvasRef} className="block" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t bg-gray-50">
          <button className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
            onClick={onClose}>取消</button>
          <button className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
            onClick={printSheet}>
            🖨 打印字帖
          </button>
          <button className="px-6 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={insertIntoDoc}>
            插入文档
          </button>
        </div>
      </div>
    </div>
  )
}

export default CalligraphyDialog
