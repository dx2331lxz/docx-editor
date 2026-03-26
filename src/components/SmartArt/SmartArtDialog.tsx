/**
 * SmartArtDialog — SmartArt图形插入对话框（简化版）
 * 支持：流程图（3种）、层级图（2种）、矩阵图（2种）
 * 使用 SVG/div 实现，可编辑文字，颜色主题
 */
import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'

interface SmartArtDialogProps {
  editor: Editor | null
  onClose: () => void
}

type SmartArtType =
  | 'process-linear'
  | 'process-chevron'
  | 'process-cycle'
  | 'hierarchy-org'
  | 'hierarchy-tree'
  | 'matrix-2x2'
  | 'matrix-swot'

interface SmartArtDef {
  type: SmartArtType
  label: string
  category: string
  defaultItems: string[]
}

const SMARTART_TYPES: SmartArtDef[] = [
  { type: 'process-linear', label: '基本流程', category: '流程', defaultItems: ['步骤一', '步骤二', '步骤三', '步骤四'] },
  { type: 'process-chevron', label: '箭头流程', category: '流程', defaultItems: ['计划', '执行', '检查', '改进'] },
  { type: 'process-cycle', label: '循环流程', category: '流程', defaultItems: ['分析', '设计', '开发', '测试'] },
  { type: 'hierarchy-org', label: '组织结构图', category: '层级', defaultItems: ['总经理', '副总经理', '部门A', '部门B', '部门C'] },
  { type: 'hierarchy-tree', label: '水平层次结构', category: '层级', defaultItems: ['根节点', '子节点1', '子节点2', '子节点3'] },
  { type: 'matrix-2x2', label: '基本矩阵', category: '矩阵', defaultItems: ['象限一', '象限二', '象限三', '象限四'] },
  { type: 'matrix-swot', label: 'SWOT分析', category: '矩阵', defaultItems: ['优势\nStrengths', '劣势\nWeaknesses', '机会\nOpportunities', '威胁\nThreats'] },
]

const COLOR_THEMES = [
  { name: '蓝色', primary: '#3b82f6', secondary: '#bfdbfe', text: '#1e40af' },
  { name: '绿色', primary: '#22c55e', secondary: '#bbf7d0', text: '#14532d' },
  { name: '橙色', primary: '#f97316', secondary: '#fed7aa', text: '#7c2d12' },
  { name: '紫色', primary: '#a855f7', secondary: '#e9d5ff', text: '#581c87' },
  { name: '红色', primary: '#ef4444', secondary: '#fecaca', text: '#7f1d1d' },
  { name: '灰色', primary: '#6b7280', secondary: '#e5e7eb', text: '#111827' },
]

function buildSmartArtHtml(type: SmartArtType, items: string[], theme: typeof COLOR_THEMES[0]): string {
  const { primary, secondary, text } = theme

  switch (type) {
    case 'process-linear': {
      const cells = items.map((item, i) => {
        const isLast = i === items.length - 1
        return `<div style="display:flex;align-items:center;gap:0;">
          <div style="background:${primary};color:white;padding:8px 16px;border-radius:4px;font-size:13px;font-weight:500;min-width:70px;text-align:center;white-space:nowrap;">${item}</div>
          ${!isLast ? `<div style="width:0;height:0;border-top:14px solid transparent;border-bottom:14px solid transparent;border-left:14px solid ${primary};flex-shrink:0;"></div>` : ''}
        </div>`
      }).join('')
      return `<div class="smartart" data-sa-type="${type}" contenteditable="false" style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;padding:16px;background:${secondary};border-radius:8px;border:1px solid ${primary}40;margin:8px 0;">${cells}</div>`
    }

    case 'process-chevron': {
      const cells = items.map((item, i) => {
        const isFirst = i === 0
        const isLast = i === items.length - 1
        const clipPath = isFirst
          ? `polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)`
          : isLast
          ? `polygon(14px 0, 100% 0, 100% 100%, 14px 100%, 0 50%)`
          : `polygon(14px 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 14px 100%, 0 50%)`
        return `<div style="background:${primary};color:white;padding:10px 20px;clip-path:${clipPath};font-size:12px;font-weight:500;text-align:center;min-width:90px;margin-left:${i > 0 ? '-8px' : '0'};">${item}</div>`
      }).join('')
      return `<div class="smartart" data-sa-type="${type}" contenteditable="false" style="display:flex;align-items:stretch;padding:16px;background:${secondary};border-radius:8px;border:1px solid ${primary}40;margin:8px 0;overflow:hidden;">${cells}</div>`
    }

    case 'process-cycle': {
      const n = items.length
      const r = 90
      const cx = 130, cy = 130
      const svgItems = items.map((item, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2
        const x = cx + r * Math.cos(angle)
        const y = cy + r * Math.sin(angle)
        const color = primary
        return `<g>
          <circle cx="${x}" cy="${y}" r="28" fill="${color}" />
          <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="10" font-weight="500">${item}</text>
        </g>`
      }).join('')
      // Draw connecting arcs
      const arcs = items.map((_, i) => {
        const a1 = (i / n) * 2 * Math.PI - Math.PI / 2
        const a2 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2
        const x1 = cx + (r - 32) * Math.cos(a1)
        const y1 = cy + (r - 32) * Math.sin(a1)
        const x2 = cx + (r - 32) * Math.cos(a2)
        const y2 = cy + (r - 32) * Math.sin(a2)
        return `<path d="M ${x1} ${y1} A ${r-32} ${r-32} 0 0 1 ${x2} ${y2}" fill="none" stroke="${primary}80" stroke-width="2" marker-end="url(#arr)" />`
      }).join('')
      return `<div class="smartart" data-sa-type="${type}" contenteditable="false" style="text-align:center;padding:8px;background:${secondary};border-radius:8px;border:1px solid ${primary}40;margin:8px 0;">
        <svg width="260" height="260" style="max-width:100%">
          <defs><marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${primary}80"/></marker></defs>
          ${arcs}${svgItems}
        </svg>
      </div>`
    }

    case 'hierarchy-org': {
      const [root, ...children] = items
      const childCols = children.map(c => `<div style="background:${secondary};border:2px solid ${primary};border-radius:6px;padding:6px 12px;font-size:12px;color:${text};font-weight:500;text-align:center;">${c}</div>`).join('')
      return `<div class="smartart" data-sa-type="${type}" contenteditable="false" style="text-align:center;padding:16px;background:white;border-radius:8px;border:1px solid ${primary}40;margin:8px 0;">
        <div style="background:${primary};color:white;padding:8px 20px;border-radius:6px;display:inline-block;font-size:14px;font-weight:600;margin-bottom:8px;">${root}</div>
        <div style="border-left:2px solid ${primary};margin:0 auto;height:16px;width:2px;"></div>
        <div style="border-top:2px solid ${primary};display:flex;gap:12px;justify-content:center;padding-top:16px;">${childCols}</div>
      </div>`
    }

    case 'hierarchy-tree': {
      const [root, ...children] = items
      const childRows = children.map(c => `<div style="background:${secondary};border:2px solid ${primary};border-radius:6px;padding:6px 12px;font-size:12px;color:${text};">${c}</div>`).join('')
      return `<div class="smartart" data-sa-type="${type}" contenteditable="false" style="display:flex;align-items:center;gap:16px;padding:16px;background:white;border-radius:8px;border:1px solid ${primary}40;margin:8px 0;">
        <div style="background:${primary};color:white;padding:10px 18px;border-radius:6px;font-size:14px;font-weight:600;flex-shrink:0;">${root}</div>
        <div style="border-left:2px solid ${primary};height:60px;"></div>
        <div style="display:flex;flex-direction:column;gap:6px;">${childRows}</div>
      </div>`
    }

    case 'matrix-2x2': {
      const [a, b, c, d] = [...items, '', '', '', '']
      return `<div class="smartart" data-sa-type="${type}" contenteditable="false" style="display:grid;grid-template-columns:1fr 1fr;gap:2px;padding:16px;background:${secondary};border-radius:8px;border:1px solid ${primary}40;margin:8px 0;">
        ${[a, b, c, d].map((item, i) => `<div style="background:${i % 2 === 0 ? primary : primary + 'cc'};color:white;padding:20px;font-size:13px;font-weight:500;text-align:center;border-radius:4px;min-height:60px;display:flex;align-items:center;justify-content:center;">${item}</div>`).join('')}
      </div>`
    }

    case 'matrix-swot': {
      const [s, w, o, t] = [...items, '', '', '', '']
      const colors = [
        { bg: '#22c55e', label: 'S' },
        { bg: '#ef4444', label: 'W' },
        { bg: '#3b82f6', label: 'O' },
        { bg: '#f97316', label: 'T' },
      ]
      const cells = [s, w, o, t].map((item, i) => {
        const lines = item.split('\n')
        return `<div style="background:${colors[i].bg};color:white;padding:12px;border-radius:4px;min-height:70px;">
          <div style="font-size:18px;font-weight:700;opacity:0.9;line-height:1;">${colors[i].label}</div>
          <div style="font-size:12px;font-weight:500;margin-top:4px;">${lines[0]}</div>
          ${lines[1] ? `<div style="font-size:10px;opacity:0.85;">${lines[1]}</div>` : ''}
        </div>`
      }).join('')
      return `<div class="smartart" data-sa-type="${type}" contenteditable="false" style="display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:16px;background:${secondary};border-radius:8px;border:1px solid ${primary}40;margin:8px 0;">${cells}</div>`
    }

    default:
      return '<div>SmartArt</div>'
  }
}

const SmartArtDialog: React.FC<SmartArtDialogProps> = ({ editor, onClose }) => {
  const [selectedType, setSelectedType] = useState<SmartArtType>('process-linear')
  const [colorTheme, setColorTheme] = useState(0)
  const [items, setItems] = useState<string[]>(SMARTART_TYPES[0].defaultItems)

  const theme = COLOR_THEMES[colorTheme]

  const handleTypeChange = (type: SmartArtType) => {
    setSelectedType(type)
    const def = SMARTART_TYPES.find(d => d.type === type)!
    setItems([...def.defaultItems])
  }

  const handleInsert = () => {
    if (!editor) return
    const html = buildSmartArtHtml(selectedType, items, theme)
    editor.chain().focus().insertContent(html).run()
    onClose()
  }

  const categories = [...new Set(SMARTART_TYPES.map(t => t.category))]
  const previewHtml = buildSmartArtHtml(selectedType, items, theme)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[720px] flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-base font-semibold text-gray-800">插入 SmartArt 图形</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: type selector */}
          <div className="w-48 border-r overflow-y-auto bg-gray-50 p-3">
            {categories.map(cat => (
              <div key={cat} className="mb-3">
                <div className="text-xs font-semibold text-gray-500 mb-1 px-1">{cat}</div>
                {SMARTART_TYPES.filter(t => t.category === cat).map(t => (
                  <button
                    key={t.type}
                    onClick={() => handleTypeChange(t.type)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${selectedType === t.type ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700 hover:bg-white'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Right: config + preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4">
              {/* Preview */}
              <div className="mb-4">
                <div className="text-xs font-medium text-gray-500 mb-2">预览</div>
                <div
                  className="border border-gray-200 rounded p-2 bg-gray-50 min-h-20 overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>

              {/* Color theme */}
              <div className="mb-4">
                <div className="text-xs font-medium text-gray-500 mb-2">颜色主题</div>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_THEMES.map((ct, i) => (
                    <button
                      key={ct.name}
                      onClick={() => setColorTheme(i)}
                      title={ct.name}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${colorTheme === i ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                      style={{ background: ct.primary }}
                    />
                  ))}
                </div>
              </div>

              {/* Text items */}
              <div>
                <div className="text-xs font-medium text-gray-500 mb-2">文字内容</div>
                <div className="space-y-1.5">
                  {items.map((item, i) => (
                    <div key={i} className="flex gap-1.5 items-center">
                      <span className="text-xs text-gray-400 w-4">{i + 1}.</span>
                      <input
                        type="text"
                        value={item}
                        onChange={e => setItems(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                        placeholder={`项目 ${i + 1}`}
                      />
                      {items.length > 2 && (
                        <button
                          onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}
                          className="text-gray-300 hover:text-red-400 text-sm"
                        >×</button>
                      )}
                    </div>
                  ))}
                  {items.length < 6 && (
                    <button
                      onClick={() => setItems(prev => [...prev, `项目${prev.length + 1}`])}
                      className="text-xs text-blue-600 hover:underline ml-6"
                    >+ 添加项目</button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end px-4 py-3 border-t bg-gray-50">
              <button className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded" onClick={onClose}>取消</button>
              <button className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" onClick={handleInsert}>插入</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SmartArtDialog
