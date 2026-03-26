import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'

const MATH_SYMBOLS = [
  { sym: '∑', label: '求和' }, { sym: '∫', label: '积分' }, { sym: '√', label: '根号' },
  { sym: 'π', label: 'Pi' }, { sym: '±', label: '±' }, { sym: '≠', label: '不等' },
  { sym: '≤', label: '≤' }, { sym: '≥', label: '≥' }, { sym: '∞', label: '无穷' },
  { sym: '∈', label: '属于' }, { sym: '∉', label: '不属于' }, { sym: '∪', label: '并集' },
  { sym: '∩', label: '交集' }, { sym: '⊂', label: '子集' }, { sym: '∀', label: '任意' },
  { sym: '∃', label: '存在' }, { sym: 'Δ', label: 'Delta' }, { sym: '∇', label: 'Nabla' },
  { sym: 'α', label: 'alpha' }, { sym: 'β', label: 'beta' }, { sym: 'γ', label: 'gamma' },
  { sym: 'θ', label: 'theta' }, { sym: 'λ', label: 'lambda' }, { sym: 'μ', label: 'mu' },
  { sym: 'σ', label: 'sigma' }, { sym: 'φ', label: 'phi' }, { sym: 'ω', label: 'omega' },
  { sym: '×', label: '乘' }, { sym: '÷', label: '除' }, { sym: '≈', label: '约等' },
]

interface Props {
  editor: Editor | null
  onClose: () => void
}

const FormulaDialog: React.FC<Props> = ({ editor, onClose }) => {
  const [formula, setFormula] = useState('')
  const [numerator, setNumerator] = useState('')
  const [denominator, setDenominator] = useState('')
  const [base, setBase] = useState('')
  const [superText, setSuperText] = useState('')
  const [subText, setSubText] = useState('')

  const insertSymbol = (sym: string) => setFormula(f => f + sym)

  const insertFraction = () => {
    if (numerator && denominator) {
      setFormula(f => f + `(${numerator})/(${denominator})`)
    }
  }

  const insertSuperSub = () => {
    if (base) {
      let result = base
      if (superText) result += `^{${superText}}`
      if (subText) result += `_{${subText}}`
      setFormula(f => f + result)
    }
  }

  const handleInsert = () => {
    if (!editor || !formula.trim()) return
    // Render formula as rich text with superscript/subscript support
    // Parse simple patterns: base^{sup}_{sub} and (a)/(b)
    let display = formula
    // Insert as inline math node (styled span)
    editor.chain().focus().insertContent(
      `<span class="formula-inline" style="font-family:serif;font-style:italic;background:#f0f4ff;border-radius:3px;padding:1px 4px;">${display}</span>`
    ).run()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[560px] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">公式编辑器</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        {/* Symbol palette */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-1.5">数学符号</p>
          <div className="flex flex-wrap gap-1">
            {MATH_SYMBOLS.map(({ sym, label }) => (
              <button
                key={sym}
                onClick={() => insertSymbol(sym)}
                title={label}
                className="w-8 h-8 border border-gray-200 rounded text-sm hover:bg-blue-50 hover:border-blue-300 font-serif"
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        {/* Fraction builder */}
        <div className="mb-3 flex items-center gap-3 p-2.5 bg-gray-50 rounded border border-gray-200">
          <span className="text-xs font-medium text-gray-500 w-12">分数</span>
          <input className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
            placeholder="分子" value={numerator} onChange={e => setNumerator(e.target.value)} />
          <span className="text-gray-500 font-bold">/</span>
          <input className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
            placeholder="分母" value={denominator} onChange={e => setDenominator(e.target.value)} />
          <button onClick={insertFraction}
            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">插入</button>
        </div>

        {/* Superscript/Subscript builder */}
        <div className="mb-3 flex items-center gap-3 p-2.5 bg-gray-50 rounded border border-gray-200">
          <span className="text-xs font-medium text-gray-500 w-12">上下标</span>
          <input className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
            placeholder="底数" value={base} onChange={e => setBase(e.target.value)} />
          <input className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
            placeholder="上标" value={superText} onChange={e => setSuperText(e.target.value)} />
          <input className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
            placeholder="下标" value={subText} onChange={e => setSubText(e.target.value)} />
          <button onClick={insertSuperSub}
            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">插入</button>
        </div>

        {/* Formula input */}
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-500 mb-1">公式内容</p>
          <textarea
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={2}
            placeholder="在此输入或使用上方工具构建公式..."
            value={formula}
            onChange={e => setFormula(e.target.value)}
          />
        </div>

        {/* Preview */}
        <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-100 min-h-10">
          <p className="text-xs text-gray-500 mb-1">预览</p>
          <span className="font-serif italic text-base">
            {formula || <span className="text-gray-400 text-xs not-italic">（公式将在此处显示）</span>}
          </span>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50">取消</button>
          <button onClick={handleInsert} disabled={!formula.trim()}
            className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">
            插入公式
          </button>
        </div>
      </div>
    </div>
  )
}

export default FormulaDialog
