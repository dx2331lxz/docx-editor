import { useState, useEffect, useRef } from 'react'
import { Editor } from '@tiptap/react'

interface TableData {
  headers: string[]
  rows: number[][]
}

type ChartType = 'bar' | 'line' | 'pie'

interface Props {
  editor: Editor | null
  onClose: () => void
}

function parseTableFromEditor(editor: Editor | null): TableData | null {
  if (!editor) return null
  const { state } = editor
  const headers: string[] = []
  const rows: number[][] = []
  let inTable = false
  let isFirstRow = true

  state.doc.descendants(node => {
    if (node.type.name === 'table') { inTable = true; isFirstRow = true }
    if (!inTable) return
    if (node.type.name === 'tableRow') {
      const cells: string[] = []
      node.forEach(cell => {
        cells.push(cell.textContent.trim())
      })
      if (isFirstRow) {
        headers.push(...cells)
        isFirstRow = false
      } else {
        const nums = cells.map(c => parseFloat(c) || 0)
        if (nums.some(n => n !== 0)) rows.push(nums)
      }
    }
  })
  if (headers.length === 0) return null
  return { headers, rows }
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']

function BarChart({ data, title }: { data: TableData; title: string }) {
  const maxVal = Math.max(...data.rows.flatMap(r => r))
  const width = 360
  const height = 200
  const padding = { top: 20, right: 20, bottom: 40, left: 40 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const barCount = data.rows.length
  const groupWidth = innerW / Math.max(barCount, 1)
  const barWidth = Math.min(groupWidth * 0.6, 30)

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <text x={width / 2} y={14} textAnchor="middle" fontSize={12} fill="#374151" fontWeight="600">{title}</text>
      {/* Y axis */}
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + innerH} stroke="#e5e7eb" />
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = padding.top + innerH - t * innerH
        return <g key={t}>
          <line x1={padding.left - 4} y1={y} x2={padding.left + innerW} y2={y} stroke="#f3f4f6" />
          <text x={padding.left - 6} y={y + 4} textAnchor="end" fontSize={9} fill="#9ca3af">{Math.round(t * maxVal)}</text>
        </g>
      })}
      {/* Bars */}
      {data.rows.map((row, ri) => {
        const x = padding.left + ri * groupWidth + groupWidth / 2 - barWidth / 2
        const barH = (row[0] / maxVal) * innerH
        const y = padding.top + innerH - barH
        const label = data.headers[ri] || `Row ${ri + 1}`
        return <g key={ri}>
          <rect x={x} y={y} width={barWidth} height={barH} fill={COLORS[ri % COLORS.length]} rx={2} />
          <text x={x + barWidth / 2} y={padding.top + innerH + 12} textAnchor="middle" fontSize={9} fill="#6b7280">{label.slice(0, 6)}</text>
        </g>
      })}
    </svg>
  )
}

function LineChart({ data, title }: { data: TableData; title: string }) {
  const maxVal = Math.max(...data.rows.flatMap(r => r))
  const width = 360
  const height = 200
  const padding = { top: 20, right: 20, bottom: 40, left: 40 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const points = data.rows.map((row, i) => ({
    x: padding.left + (i / Math.max(data.rows.length - 1, 1)) * innerW,
    y: padding.top + innerH - (row[0] / maxVal) * innerH,
  }))
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <text x={width / 2} y={14} textAnchor="middle" fontSize={12} fill="#374151" fontWeight="600">{title}</text>
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + innerH} stroke="#e5e7eb" />
      <line x1={padding.left} y1={padding.top + innerH} x2={padding.left + innerW} y2={padding.top + innerH} stroke="#e5e7eb" />
      <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth={2} />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="#3b82f6" />
      ))}
      {data.rows.map((_, ri) => {
        const x = padding.left + (ri / Math.max(data.rows.length - 1, 1)) * innerW
        return <text key={ri} x={x} y={padding.top + innerH + 12} textAnchor="middle" fontSize={9} fill="#6b7280">
          {(data.headers[ri] || `R${ri + 1}`).slice(0, 6)}
        </text>
      })}
    </svg>
  )
}

function PieChart({ data, title }: { data: TableData; title: string }) {
  const total = data.rows.reduce((s, r) => s + (r[0] || 0), 0)
  const cx = 100, cy = 100, r = 80
  let startAngle = -Math.PI / 2

  const slices = data.rows.map((row, i) => {
    const val = row[0] || 0
    const angle = (val / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    startAngle += angle
    const x2 = cx + r * Math.cos(startAngle)
    const y2 = cy + r * Math.sin(startAngle)
    const largeArc = angle > Math.PI ? 1 : 0
    return {
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: COLORS[i % COLORS.length],
      label: (data.headers[i] || `R${i + 1}`).slice(0, 8),
      pct: total > 0 ? Math.round((val / total) * 100) : 0,
    }
  })

  return (
    <svg width={360} height={220} style={{ display: 'block' }}>
      <text x={180} y={14} textAnchor="middle" fontSize={12} fill="#374151" fontWeight="600">{title}</text>
      {slices.map((s, i) => (
        <path key={i} d={s.d} fill={s.color} stroke="#fff" strokeWidth={2} />
      ))}
      {/* Legend */}
      {slices.map((s, i) => (
        <g key={i} transform={`translate(210, ${20 + i * 18})`}>
          <rect width={12} height={12} fill={s.color} rx={2} />
          <text x={16} y={10} fontSize={10} fill="#374151">{s.label} {s.pct}%</text>
        </g>
      ))}
    </svg>
  )
}

export default function TableChartDialog({ editor, onClose }: Props) {
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [title, setTitle] = useState('数据图表')
  const [tableData, setTableData] = useState<TableData | null>(null)
  const sampleData: TableData = { headers: ['一月', '二月', '三月', '四月', '五月'], rows: [[42], [65], [38], [78], [55]] }

  useEffect(() => {
    const parsed = parseTableFromEditor(editor)
    setTableData(parsed)
  }, [editor])

  const data = tableData || sampleData

  function insertChart() {
    if (!editor) return
    const svgContainer = document.getElementById('table-chart-preview')
    if (!svgContainer) return
    const svgEl = svgContainer.querySelector('svg')
    if (!svgEl) return
    const svgStr = new XMLSerializer().serializeToString(svgEl)
    const b64 = btoa(unescape(encodeURIComponent(svgStr)))
    const dataUrl = `data:image/svg+xml;base64,${b64}`
    editor.chain().focus().insertContent(`<img src="${dataUrl}" alt="${title}" style="max-width:100%;display:block;margin:12px auto;" />`).run()
    onClose()
  }

  const TYPES: { value: ChartType; label: string; icon: string }[] = [
    { value: 'bar', label: '柱状图', icon: '📊' },
    { value: 'line', label: '折线图', icon: '📈' },
    { value: 'pie', label: '饼图', icon: '🥧' },
  ]

  const ChartComponent = chartType === 'bar' ? BarChart : chartType === 'line' ? LineChart : PieChart

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 10, width: 520, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#1e293b' }}>从表格数据创建图表</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          {!tableData && (
            <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#92400e', marginBottom: 14 }}>
              ⚠️ 未检测到表格数据，使用示例数据预览
            </div>
          )}
          {/* Chart type */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {TYPES.map(t => (
              <button key={t.value} onClick={() => setChartType(t.value)}
                style={{ flex: 1, padding: '8px 4px', border: `2px solid ${chartType === t.value ? '#3b82f6' : '#e5e7eb'}`, borderRadius: 6, cursor: 'pointer', background: chartType === t.value ? '#eff6ff' : '#fff', fontSize: 12, fontWeight: chartType === t.value ? 600 : 400 }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>图表标题</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          {/* Preview */}
          <div id="table-chart-preview" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'center' }}>
            <ChartComponent data={data} title={title} />
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '6px 18px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>取消</button>
          <button onClick={insertChart} style={{ padding: '6px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>插入图表</button>
        </div>
      </div>
    </div>
  )
}
