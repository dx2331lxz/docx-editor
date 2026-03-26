import React, { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'

type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'radar' | 'scatter'

interface DataPoint { label: string; value: number }

const CHART_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f97316', '#a855f7']

function drawBarChart(ctx: CanvasRenderingContext2D, w: number, h: number, data: DataPoint[]) {
  const pad = { top: 30, right: 20, bottom: 50, left: 50 }
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom
  const maxVal = Math.max(...data.map(d => d.value), 1)

  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)

  // Y-axis grid
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + chartH - (i / 5) * chartH
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke()
    ctx.fillStyle = '#6b7280'; ctx.font = '11px sans-serif'; ctx.textAlign = 'right'
    ctx.fillText(String(Math.round(maxVal * i / 5)), pad.left - 6, y + 4)
  }

  // Bars
  const barW = (chartW / data.length) * 0.6
  const gap = chartW / data.length
  data.forEach((d, i) => {
    const barH = (d.value / maxVal) * chartH
    const x = pad.left + i * gap + (gap - barW) / 2
    const y = pad.top + chartH - barH
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length]
    ctx.fillRect(x, y, barW, barH)
    // Label
    ctx.fillStyle = '#374151'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(d.label, x + barW / 2, pad.top + chartH + 16)
    // Value
    ctx.fillStyle = '#1f2937'; ctx.font = 'bold 11px sans-serif'
    ctx.fillText(String(d.value), x + barW / 2, y - 4)
  })

  // Axes
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + chartH); ctx.lineTo(pad.left + chartW, pad.top + chartH); ctx.stroke()
}

function drawLineChart(ctx: CanvasRenderingContext2D, w: number, h: number, data: DataPoint[]) {
  const pad = { top: 30, right: 20, bottom: 50, left: 50 }
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom
  const maxVal = Math.max(...data.map(d => d.value), 1)

  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + chartH - (i / 5) * chartH
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke()
    ctx.fillStyle = '#6b7280'; ctx.font = '11px sans-serif'; ctx.textAlign = 'right'
    ctx.fillText(String(Math.round(maxVal * i / 5)), pad.left - 6, y + 4)
  }

  const step = chartW / (data.length - 1 || 1)
  const points = data.map((d, i) => ({
    x: pad.left + i * step,
    y: pad.top + chartH - (d.value / maxVal) * chartH,
  }))

  // Area fill
  ctx.beginPath()
  ctx.moveTo(points[0].x, pad.top + chartH)
  points.forEach(p => ctx.lineTo(p.x, p.y))
  ctx.lineTo(points[points.length - 1].x, pad.top + chartH)
  ctx.closePath()
  ctx.fillStyle = 'rgba(59,130,246,0.15)'
  ctx.fill()

  // Line
  ctx.beginPath(); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2.5
  points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
  ctx.stroke()

  // Points + labels
  points.forEach((p, i) => {
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#3b82f6'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = '#374151'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(data[i].label, p.x, pad.top + chartH + 16)
    ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = '#1f2937'
    ctx.fillText(String(data[i].value), p.x, p.y - 10)
  })

  ctx.strokeStyle = '#374151'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + chartH); ctx.lineTo(pad.left + chartW, pad.top + chartH); ctx.stroke()
}

function drawAreaChart(ctx: CanvasRenderingContext2D, w: number, h: number, data: DataPoint[]) {
  const pad = { top: 30, right: 20, bottom: 50, left: 50 }
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom
  const maxVal = Math.max(...data.map(d => d.value), 1)

  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)

  // Grid
  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + chartH - (i / 5) * chartH
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke()
    ctx.fillStyle = '#6b7280'; ctx.font = '11px sans-serif'; ctx.textAlign = 'right'
    ctx.fillText(String(Math.round(maxVal * i / 5)), pad.left - 6, y + 4)
  }

  const step = chartW / (data.length - 1 || 1)
  const points = data.map((d, i) => ({ x: pad.left + i * step, y: pad.top + chartH - (d.value / maxVal) * chartH }))

  // Gradient fill
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH)
  grad.addColorStop(0, 'rgba(59,130,246,0.5)')
  grad.addColorStop(1, 'rgba(59,130,246,0.05)')
  ctx.beginPath()
  ctx.moveTo(points[0].x, pad.top + chartH)
  points.forEach(p => ctx.lineTo(p.x, p.y))
  ctx.lineTo(points[points.length - 1].x, pad.top + chartH)
  ctx.closePath()
  ctx.fillStyle = grad; ctx.fill()

  // Line
  ctx.beginPath(); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2.5
  points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
  ctx.stroke()

  // Points
  points.forEach((p, i) => {
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#3b82f6'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = '#374151'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(data[i].label, p.x, pad.top + chartH + 16)
  })

  ctx.strokeStyle = '#374151'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + chartH); ctx.lineTo(pad.left + chartW, pad.top + chartH); ctx.stroke()
}

function drawRadarChart(ctx: CanvasRenderingContext2D, w: number, h: number, data: DataPoint[]) {
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)

  const cx = w / 2, cy = h / 2
  const r = Math.min(w, h) * 0.35
  const n = data.length
  const maxVal = Math.max(...data.map(d => d.value), 1)

  // Grid polygons
  for (let level = 1; level <= 4; level++) {
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2
      const lr = r * level / 4
      const x = cx + lr * Math.cos(angle)
      const y = cy + lr * Math.sin(angle)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1; ctx.stroke()
  }

  // Spokes
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle))
    ctx.strokeStyle = '#e5e7eb'; ctx.stroke()

    // Labels
    const lx = cx + (r + 18) * Math.cos(angle)
    const ly = cy + (r + 18) * Math.sin(angle)
    ctx.fillStyle = '#374151'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(data[i].label, lx, ly + 4)
  }

  // Data polygon
  ctx.beginPath()
  data.forEach((d, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2
    const dr = r * (d.value / maxVal)
    const x = cx + dr * Math.cos(angle)
    const y = cy + dr * Math.sin(angle)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.closePath()
  ctx.fillStyle = 'rgba(59,130,246,0.25)'; ctx.fill()
  ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.stroke()

  // Dots
  data.forEach((d, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2
    const dr = r * (d.value / maxVal)
    ctx.beginPath()
    ctx.arc(cx + dr * Math.cos(angle), cy + dr * Math.sin(angle), 4, 0, Math.PI * 2)
    ctx.fillStyle = '#3b82f6'; ctx.fill()
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke()
  })
}

function drawScatterChart(ctx: CanvasRenderingContext2D, w: number, h: number, data: DataPoint[]) {
  const pad = { top: 30, right: 20, bottom: 50, left: 50 }
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom
  const maxX = data.length
  const maxY = Math.max(...data.map(d => d.value), 1)

  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)

  // Grid
  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + chartH - (i / 5) * chartH
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke()
    ctx.fillStyle = '#6b7280'; ctx.font = '11px sans-serif'; ctx.textAlign = 'right'
    ctx.fillText(String(Math.round(maxY * i / 5)), pad.left - 6, y + 4)
  }

  // Scatter points
  data.forEach((d, i) => {
    const x = pad.left + ((i + 1) / (maxX + 1)) * chartW
    const y = pad.top + chartH - (d.value / maxY) * chartH
    ctx.beginPath()
    ctx.arc(x, y, 7, 0, Math.PI * 2)
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length]
    ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.fillStyle = '#374151'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(d.label, x, pad.top + chartH + 16)
    ctx.fillStyle = '#1f2937'; ctx.font = 'bold 10px sans-serif'
    ctx.fillText(String(d.value), x, y - 12)
  })

  ctx.strokeStyle = '#374151'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + chartH); ctx.lineTo(pad.left + chartW, pad.top + chartH); ctx.stroke()
}


function drawPieChart(ctx: CanvasRenderingContext2D, w: number, h: number, data: DataPoint[]) {
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)

  const cx = w / 2, cy = h / 2 - 10, r = Math.min(w, h) * 0.35
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  let angle = -Math.PI / 2

  data.forEach((d, i) => {
    const slice = (d.value / total) * Math.PI * 2
    ctx.beginPath(); ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, angle, angle + slice)
    ctx.closePath()
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length]; ctx.fill()
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke()

    // Label
    const mid = angle + slice / 2
    const lx = cx + (r + 22) * Math.cos(mid)
    const ly = cy + (r + 22) * Math.sin(mid)
    ctx.fillStyle = '#374151'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(`${d.label} ${Math.round(d.value / total * 100)}%`, lx, ly)

    angle += slice
  })
}

interface Props {
  editor: Editor | null
  onClose: () => void
}

const ChartDialog: React.FC<Props> = ({ editor, onClose }) => {
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [data, setData] = useState<DataPoint[]>([
    { label: 'A', value: 30 },
    { label: 'B', value: 55 },
    { label: 'C', value: 40 },
    { label: 'D', value: 70 },
  ])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const valid = data.filter(d => d.label.trim() && !isNaN(d.value))
    if (valid.length === 0) return
    if (chartType === 'bar') drawBarChart(ctx, canvas.width, canvas.height, valid)
    else if (chartType === 'line') drawLineChart(ctx, canvas.width, canvas.height, valid)
    else if (chartType === 'area') drawAreaChart(ctx, canvas.width, canvas.height, valid)
    else if (chartType === 'radar') drawRadarChart(ctx, canvas.width, canvas.height, valid)
    else if (chartType === 'scatter') drawScatterChart(ctx, canvas.width, canvas.height, valid)
    else drawPieChart(ctx, canvas.width, canvas.height, valid)
  }

  useEffect(() => { draw() }, [chartType, data])

  const updatePoint = (i: number, field: 'label' | 'value', val: string) => {
    setData(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: field === 'value' ? Number(val) || 0 : val } : d))
  }

  const handleInsert = () => {
    const canvas = canvasRef.current
    if (!canvas || !editor) return
    const dataUrl = canvas.toDataURL('image/png')
    editor.chain().focus().setImage({ src: dataUrl, alt: `${chartType} chart` }).run()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[640px] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">插入图表</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        <div className="flex gap-4">
          {/* Left: controls */}
          <div className="w-48 flex-shrink-0 space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">图表类型</p>
              <div className="flex flex-col gap-1">
                {([['bar', '📊 柱状图'], ['line', '📈 折线图'], ['area', '📉 面积图'], ['radar', '🕸️ 雷达图'], ['scatter', '⚬ 散点图'], ['pie', '🥧 饼图']] as const).map(([t, label]) => (
                  <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={chartType === t} onChange={() => setChartType(t)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">数据</p>
              <div className="space-y-1.5">
                {data.map((d, i) => (
                  <div key={i} className="flex gap-1 items-center">
                    <input
                      className="w-12 border border-gray-300 rounded px-1.5 py-0.5 text-xs"
                      placeholder="标签"
                      value={d.label}
                      onChange={e => updatePoint(i, 'label', e.target.value)}
                    />
                    <input
                      className="w-14 border border-gray-300 rounded px-1.5 py-0.5 text-xs"
                      type="number"
                      placeholder="值"
                      value={d.value}
                      onChange={e => updatePoint(i, 'value', e.target.value)}
                    />
                    <button onClick={() => setData(p => p.filter((_, j) => j !== i))}
                      className="text-gray-400 hover:text-red-500 text-xs">×</button>
                  </div>
                ))}
                {data.length < 5 && (
                  <button onClick={() => setData(p => [...p, { label: String.fromCharCode(65 + p.length), value: Math.floor(Math.random() * 60 + 20) }])}
                    className="text-xs text-blue-600 hover:underline">+ 添加数据</button>
                )}
              </div>
            </div>
          </div>

          {/* Right: preview */}
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-600 mb-1.5">预览</p>
            <canvas ref={canvasRef} width={380} height={260}
              className="border border-gray-200 rounded w-full" />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50">取消</button>
          <button onClick={handleInsert} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">插入图表</button>
        </div>
      </div>
    </div>
  )
}

export default ChartDialog
