/**
 * SpecialSymbolsPanel — modal for inserting special characters.
 * Organized into 4 categories; clicking a symbol inserts it at cursor.
 */

import React, { useState } from 'react'
import { X } from 'lucide-react'
import type { Editor } from '@tiptap/react'

interface SpecialSymbolsPanelProps {
  editor: Editor
  onClose: () => void
}

const CATEGORIES = [
  {
    name: '常用符号',
    symbols: [
      '©', '®', '™', '°', '±', '×', '÷', '≈', '≠', '≤', '≥',
      '∞', '∑', '∏', '√', '∫', '∂', '∆', '∇', '⊕', '⊗',
      '←', '→', '↑', '↓', '↔', '⇐', '⇒', '⇑', '⇓', '⇔',
    ],
  },
  {
    name: '标点符号',
    symbols: [
      '\u201C', '\u201D', '\u2018', '\u2019', '…', '—', '–', '·', '※',
      '★', '☆', '●', '○', '◆', '◇', '▲', '△', '▼', '▽',
      '■', '□', '▪', '▫', '♠', '♣', '♥', '♦', '♪', '♫',
    ],
  },
  {
    name: '希腊字母',
    symbols: [
      'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ',
      'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ',
      'φ', 'χ', 'ψ', 'ω',
      'Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ',
    ],
  },
  {
    name: '数学符号',
    symbols: [
      '∀', '∃', '∈', '∉', '⊂', '⊃', '⊆', '⊇', '∪', '∩',
      '⊥', '∠', '∥', '≡', '∝', '∼', '≅', '≪', '≫', '⊙',
      '∘', '∙', '⋅', '∗', '†', '‡', '℃', '℉', '№', '§',
    ],
  },
]

const SpecialSymbolsPanel: React.FC<SpecialSymbolsPanelProps> = ({ editor, onClose }) => {
  const [activeCategory, setActiveCategory] = useState(0)
  const [hovered, setHovered] = useState<string | null>(null)

  const insertSymbol = (sym: string) => {
    editor.chain().focus().insertContent(sym).run()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-[460px]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">插入特殊符号</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4">
          {/* Category tabs */}
          <div className="flex gap-1 mb-4 border-b border-gray-200">
            {CATEGORIES.map((cat, i) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setActiveCategory(i)}
                className={`px-3 py-1.5 text-sm rounded-t transition-colors ${
                  activeCategory === i
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Symbol grid */}
          <div className="grid grid-cols-10 gap-1 min-h-[120px]">
            {CATEGORIES[activeCategory].symbols.map((sym) => (
              <button
                key={sym}
                type="button"
                title={`插入 ${sym} (U+${sym.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')})`}
                className={`w-9 h-9 flex items-center justify-center rounded border text-lg transition-colors ${
                  hovered === sym
                    ? 'border-blue-400 bg-blue-50 text-blue-700 scale-110'
                    : 'border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                }`}
                onMouseEnter={() => setHovered(sym)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => {
                  insertSymbol(sym)
                  // Don't close — allow inserting multiple symbols
                }}
              >
                {sym}
              </button>
            ))}
          </div>

          {/* Preview + hint */}
          <div className="mt-3 flex items-center justify-between text-sm text-gray-500 border-t border-gray-100 pt-2">
            <span>
              {hovered ? (
                <>当前: <span className="text-2xl text-gray-800 mx-1">{hovered}</span>
                  <span className="text-xs">U+{hovered.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')}</span>
                </>
              ) : '点击符号插入到光标位置'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SpecialSymbolsPanel
