/**
 * PageNumberDialog — 页码域插入对话框
 * 支持：位置（页眉/页脚/当前位置）、对齐、格式、起始页码
 */
import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'

interface PageNumberDialogProps {
  editor: Editor | null
  onInsertToFooter?: (config: PageNumConfig) => void
  onClose: () => void
}

export interface PageNumConfig {
  position: 'header' | 'footer' | 'inline'
  align: 'left' | 'center' | 'right'
  format: 'arabic' | 'circled' | 'chinese' | 'alpha'
  startPage: number
}

const FORMAT_LABELS: Record<PageNumConfig['format'], string> = {
  arabic: '1, 2, 3 ...',
  circled: '①, ②, ③ ...',
  chinese: '一, 二, 三 ...',
  alpha: 'A, B, C ...',
}

function formatPageNum(n: number, fmt: PageNumConfig['format']): string {
  if (fmt === 'arabic') return String(n)
  if (fmt === 'alpha') return String.fromCharCode(64 + Math.min(n, 26))
  if (fmt === 'chinese') {
    const cn = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
    return n <= 10 ? cn[n] : String(n)
  }
  if (fmt === 'circled') {
    const circled = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']
    return n <= 10 ? circled[n - 1] : String(n)
  }
  return String(n)
}

const PageNumberDialog: React.FC<PageNumberDialogProps> = ({ editor, onInsertToFooter, onClose }) => {
  const [position, setPosition] = useState<PageNumConfig['position']>('footer')
  const [align, setAlign] = useState<PageNumConfig['align']>('center')
  const [format, setFormat] = useState<PageNumConfig['format']>('arabic')
  const [startPage, setStartPage] = useState(1)

  const preview = formatPageNum(startPage, format)

  const handleInsert = () => {
    const config: PageNumConfig = { position, align, format, startPage }

    if (position === 'inline' && editor) {
      const pageNumHtml = `<span class="page-number-field" data-page-num="true" data-format="${format}" data-start="${startPage}" contenteditable="false" style="background:#eff6ff;border:1px solid #93c5fd;border-radius:3px;padding:0 4px;font-size:0.9em;color:#3b82f6;cursor:default;" title="页码域">第${preview}页</span>`
      editor.chain().focus().insertContent(pageNumHtml).run()
    } else {
      onInsertToFooter?.(config)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-80 p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-4 text-gray-800">插入页码</h3>

        {/* Position */}
        <div className="mb-3">
          <label className="block text-sm text-gray-600 mb-1">位置</label>
          <div className="flex gap-2">
            {(['header', 'footer', 'inline'] as const).map(p => (
              <button key={p}
                className={`flex-1 py-1.5 text-sm rounded border transition-colors ${position === p ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                onClick={() => setPosition(p)}
              >
                {p === 'header' ? '页眉' : p === 'footer' ? '页脚' : '当前位置'}
              </button>
            ))}
          </div>
        </div>

        {/* Alignment */}
        <div className="mb-3">
          <label className="block text-sm text-gray-600 mb-1">对齐方式</label>
          <div className="flex gap-2">
            {(['left', 'center', 'right'] as const).map(a => (
              <button key={a}
                className={`flex-1 py-1.5 text-sm rounded border transition-colors ${align === a ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                onClick={() => setAlign(a)}
              >
                {a === 'left' ? '左' : a === 'center' ? '居中' : '右'}
              </button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div className="mb-3">
          <label className="block text-sm text-gray-600 mb-1">格式</label>
          <select
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            value={format}
            onChange={e => setFormat(e.target.value as PageNumConfig['format'])}
          >
            {(Object.entries(FORMAT_LABELS) as [PageNumConfig['format'], string][]).map(([f, l]) => (
              <option key={f} value={f}>{l}</option>
            ))}
          </select>
        </div>

        {/* Start page */}
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">起始页码</label>
          <input
            type="number" min={1} max={9999}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            value={startPage}
            onChange={e => setStartPage(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>

        {/* Preview */}
        <div className="mb-4 p-3 bg-gray-50 rounded text-center text-sm text-gray-500">
          预览：<span className="text-blue-600 font-medium mx-2">{preview}</span>
        </div>

        <div className="flex gap-2 justify-end">
          <button className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded" onClick={onClose}>取消</button>
          <button className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" onClick={handleInsert}>插入</button>
        </div>
      </div>
    </div>
  )
}

export { formatPageNum }
export default PageNumberDialog
