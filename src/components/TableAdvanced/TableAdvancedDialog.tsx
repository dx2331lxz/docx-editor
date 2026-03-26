/**
 * TableAdvancedDialog — 表格高级功能
 * 排序、公式(SUM/AVERAGE/COUNT/MAX/MIN)、拆分单元格、表格属性
 */
import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'

interface TableAdvancedDialogProps {
  editor: Editor | null
  onClose: () => void
}

type TabType = 'sort' | 'formula' | 'split' | 'props'

// Parse a simple cell reference like A1, B2, or range A1:C3
function parseCellRef(ref: string, data: string[][]): number[] {
  const rangeMatch = ref.trim().match(/^([A-Z])(\d+):([A-Z])(\d+)$/i)
  if (rangeMatch) {
    const c1 = rangeMatch[1].toUpperCase().charCodeAt(0) - 65
    const r1 = parseInt(rangeMatch[2]) - 1
    const c2 = rangeMatch[3].toUpperCase().charCodeAt(0) - 65
    const r2 = parseInt(rangeMatch[4]) - 1
    const values: number[] = []
    for (let r = r1; r <= r2 && r < data.length; r++) {
      for (let c = c1; c <= c2 && c < (data[r]?.length ?? 0); c++) {
        const v = parseFloat(data[r][c])
        if (!isNaN(v)) values.push(v)
      }
    }
    return values
  }
  const cellMatch = ref.trim().match(/^([A-Z])(\d+)$/i)
  if (cellMatch) {
    const c = cellMatch[1].toUpperCase().charCodeAt(0) - 65
    const r = parseInt(cellMatch[2]) - 1
    if (data[r] && data[r][c] !== undefined) {
      const v = parseFloat(data[r][c])
      return isNaN(v) ? [] : [v]
    }
  }
  return []
}

function evalFormula(formula: string, data: string[][]): string {
  const m = formula.trim().match(/^=?(\w+)\(([^)]+)\)$/i)
  if (!m) {
    const n = parseFloat(formula)
    return isNaN(n) ? '#ERR' : String(n)
  }
  const fn = m[1].toUpperCase()
  const refs = m[2].split(/[;,]/).map(r => r.trim())
  let values: number[] = []
  for (const ref of refs) {
    values = values.concat(parseCellRef(ref, data))
  }
  if (values.length === 0) return '0'
  switch (fn) {
    case 'SUM': return String(values.reduce((a, b) => a + b, 0))
    case 'AVERAGE': return String((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2))
    case 'COUNT': return String(values.length)
    case 'MAX': return String(Math.max(...values))
    case 'MIN': return String(Math.min(...values))
    default: return '#NAME?'
  }
}

/** Extract table data from editor DOM */
function extractTableData(editor: Editor): string[][] {
  const rows: string[][] = []
  const dom = editor.view.dom
  const table = dom.querySelector('table')
  if (!table) return rows
  table.querySelectorAll('tr').forEach(tr => {
    const cells: string[] = []
    tr.querySelectorAll('td, th').forEach(td => cells.push((td as HTMLElement).innerText.trim()))
    rows.push(cells)
  })
  return rows
}

const TableAdvancedDialog: React.FC<TableAdvancedDialogProps> = ({ editor, onClose }) => {
  const [tab, setTab] = useState<TabType>('sort')

  // Sort state
  const [sortCol, setSortCol] = useState(0)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [sortType, setSortType] = useState<'text' | 'number' | 'date'>('text')
  const [skipHeader, setSkipHeader] = useState(true)

  // Formula state
  const [formula, setFormula] = useState('=SUM(A1:A5)')
  const [formulaResult, setFormulaResult] = useState('')

  // Split state
  const [splitRows, setSplitRows] = useState(2)
  const [splitCols, setSplitCols] = useState(2)

  // Table props state
  const [cellPadding, setCellPadding] = useState(4)
  const [borderWidth, setBorderWidth] = useState(1)
  const [borderColor, setBorderColor] = useState('#9ca3af')
  const [headerBg, setHeaderBg] = useState('#f3f4f6')
  const [stripedRows, setStripedRows] = useState(false)
  const [tableAlign, setTableAlign] = useState<'left' | 'center' | 'right'>('left')
  const [tableWidth, setTableWidth] = useState('100%')

  const applySort = () => {
    if (!editor) return
    const data = extractTableData(editor)
    if (data.length === 0) return
    const header = skipHeader ? data[0] : null
    const body = skipHeader ? data.slice(1) : data

    body.sort((a, b) => {
      const av = a[sortCol] ?? ''
      const bv = b[sortCol] ?? ''
      let cmp = 0
      if (sortType === 'number') {
        cmp = (parseFloat(av) || 0) - (parseFloat(bv) || 0)
      } else if (sortType === 'date') {
        cmp = new Date(av).getTime() - new Date(bv).getTime()
      } else {
        cmp = av.localeCompare(bv, 'zh-CN')
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    const allRows = header ? [header, ...body] : body
    const rowsHtml = allRows.map((row, ri) =>
      `<tr>${row.map(cell => ri === 0 && header ? `<th>${cell}</th>` : `<td>${cell}</td>`).join('')}</tr>`
    ).join('')

    const tableHtml = `<table><tbody>${rowsHtml}</tbody></table>`
    // Replace existing table content
    const { state } = editor
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'table') {
        editor.view.dispatch(
          state.tr.replaceWith(pos, pos + node.nodeSize,
            editor.schema.nodeFromJSON(JSON.parse(JSON.stringify(editor.schema.nodes.table)))
          )
        )
      }
    })
    // Fallback: insert sorted table note
    editor.chain().focus().insertContent(`<p style="color:#6b7280;font-size:12px;">✓ 表格已按第${sortCol + 1}列${sortDir === 'asc' ? '升' : '降'}序排序（${body.length}行）</p>${tableHtml}`).run()
    onClose()
  }

  const calcFormula = () => {
    const data = extractTableData(editor!)
    const result = evalFormula(formula, data)
    setFormulaResult(result)
  }

  const insertFormulaResult = () => {
    if (!editor || !formulaResult) return
    editor.chain().focus().insertContent(
      `<span class="table-formula" style="background:#fef9c3;padding:1px 4px;border-radius:3px;font-family:monospace;" title="${formula}">${formulaResult}</span>`
    ).run()
    onClose()
  }

  const applySplit = () => {
    if (!editor) return
    // Generate split cell HTML approximation
    const inner = Array.from({ length: splitRows }, () =>
      Array.from({ length: splitCols }, () => '<td style="min-width:40px;min-height:20px;">&nbsp;</td>').join('')
    ).map(r => `<tr>${r}</tr>`).join('')
    const html = `<table style="border-collapse:collapse;display:inline-table;"><tbody>${inner}</tbody></table>`
    editor.chain().focus().insertContent(html).run()
    onClose()
  }

  const applyTableProps = () => {
    if (!editor) return
    // Inject a <style> tag for the table customization
    const css = `.ProseMirror table { border-collapse: collapse; width: ${tableWidth}; margin-${tableAlign === 'center' ? 'auto' : tableAlign === 'right' ? 'left' : 'right'}: auto; }
.ProseMirror table td, .ProseMirror table th { padding: ${cellPadding}px; border: ${borderWidth}px solid ${borderColor}; }
.ProseMirror table thead tr, .ProseMirror table tr:first-child { background: ${headerBg}; }
${stripedRows ? '.ProseMirror table tr:nth-child(even) { background: #f9fafb; }' : ''}`
    const existing = document.getElementById('table-custom-style')
    if (existing) existing.remove()
    const style = document.createElement('style')
    style.id = 'table-custom-style'
    style.textContent = css
    document.head.appendChild(style)
    onClose()
  }

  const TABS: { id: TabType; label: string }[] = [
    { id: 'sort', label: '🔤 排序' },
    { id: 'formula', label: '∑ 公式' },
    { id: 'split', label: '⊞ 拆分' },
    { id: 'props', label: '🎨 属性' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[480px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-base font-semibold">表格工具</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {TABS.map(t => (
            <button key={t.id}
              className={`flex-1 py-2 text-sm border-b-2 transition-colors ${tab === t.id ? 'border-blue-500 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Sort */}
          {tab === 'sort' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">排序列（从1开始）</label>
                  <input type="number" min="1" max="20" value={sortCol + 1}
                    onChange={e => setSortCol(Math.max(0, parseInt(e.target.value) - 1))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">排序方向</label>
                  <select value={sortDir} onChange={e => setSortDir(e.target.value as 'asc' | 'desc')}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                    <option value="asc">升序 A→Z / 小→大</option>
                    <option value="desc">降序 Z→A / 大→小</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">数据类型</label>
                <select value={sortType} onChange={e => setSortType(e.target.value as typeof sortType)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                  <option value="text">文本</option>
                  <option value="number">数字</option>
                  <option value="date">日期</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={skipHeader} onChange={e => setSkipHeader(e.target.checked)} />
                首行为标题（不参与排序）
              </label>
              <button className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                onClick={applySort}>
                应用排序
              </button>
            </div>
          )}

          {/* Formula */}
          {tab === 'formula' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded text-xs text-blue-700">
                支持函数：SUM、AVERAGE、COUNT、MAX、MIN<br/>
                单元格引用：A1（第1列第1行），范围：A1:C3<br/>
                列用字母(A,B,C…)，行用数字(1,2,3…)
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">公式</label>
                <input type="text" value={formula} onChange={e => setFormula(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono"
                  placeholder="=SUM(A1:A5)" />
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2 border border-gray-300 rounded text-sm hover:bg-gray-100"
                  onClick={calcFormula}>计算预览</button>
                <button className="flex-1 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                  onClick={insertFormulaResult} disabled={!formulaResult}>
                  插入结果
                </button>
              </div>
              {formulaResult && (
                <div className="p-3 bg-green-50 rounded text-sm text-green-700 font-mono">
                  结果：{formulaResult}
                </div>
              )}
              <div className="text-xs text-gray-500">
                快捷公式：
                <div className="flex flex-wrap gap-1 mt-1">
                  {['=SUM(A1:A10)', '=AVERAGE(B1:B5)', '=COUNT(A1:C1)', '=MAX(A1:A10)', '=MIN(A1:A10)'].map(f => (
                    <button key={f} className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-mono"
                      onClick={() => setFormula(f)}>{f}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Split */}
          {tab === 'split' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 rounded text-xs text-amber-700">
                此操作在光标位置插入拆分后的单元格网格
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">拆分为 N 行</label>
                  <input type="number" min="1" max="10" value={splitRows}
                    onChange={e => setSplitRows(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">拆分为 N 列</label>
                  <input type="number" min="1" max="10" value={splitCols}
                    onChange={e => setSplitCols(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                </div>
              </div>
              {/* Preview */}
              <div className="border rounded p-3 bg-gray-50">
                <div className="text-xs text-gray-500 mb-2">预览（{splitRows}行 × {splitCols}列）</div>
                <table className="border-collapse" style={{ width: '100%' }}>
                  <tbody>
                    {Array.from({ length: splitRows }, (_, ri) => (
                      <tr key={ri}>
                        {Array.from({ length: splitCols }, (_, ci) => (
                          <td key={ci} className="border border-gray-300 text-center text-xs text-gray-400 py-2"
                            style={{ width: `${100 / splitCols}%` }}>
                            {String.fromCharCode(65 + ci)}{ri + 1}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                onClick={applySplit}>
                插入拆分网格
              </button>
            </div>
          )}

          {/* Props */}
          {tab === 'props' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">单元格内边距 ({cellPadding}px)</label>
                  <input type="range" min="0" max="20" value={cellPadding}
                    onChange={e => setCellPadding(parseInt(e.target.value))} className="w-full" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">边框宽度 ({borderWidth}px)</label>
                  <input type="range" min="0" max="5" value={borderWidth}
                    onChange={e => setBorderWidth(parseInt(e.target.value))} className="w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">边框颜色</label>
                  <input type="color" value={borderColor}
                    onChange={e => setBorderColor(e.target.value)}
                    className="w-full h-8 rounded border cursor-pointer" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">表头背景</label>
                  <input type="color" value={headerBg}
                    onChange={e => setHeaderBg(e.target.value)}
                    className="w-full h-8 rounded border cursor-pointer" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">表格对齐</label>
                  <select value={tableAlign} onChange={e => setTableAlign(e.target.value as typeof tableAlign)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                    <option value="left">左对齐</option>
                    <option value="center">居中</option>
                    <option value="right">右对齐</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">表格宽度</label>
                  <select value={tableWidth} onChange={e => setTableWidth(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                    <option value="100%">100%</option>
                    <option value="75%">75%</option>
                    <option value="50%">50%</option>
                    <option value="auto">自动</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={stripedRows}
                  onChange={e => setStripedRows(e.target.checked)} />
                斑马纹（隔行变色）
              </label>
              <button className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                onClick={applyTableProps}>
                应用表格样式
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TableAdvancedDialog
