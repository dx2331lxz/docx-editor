import React, { useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'

interface CompareDialogProps {
  editor: Editor | null
  onClose: () => void
}

interface DiffItem {
  type: 'equal' | 'delete' | 'insert'
  text: string
}

function diffLines(a: string, b: string): DiffItem[] {
  const aLines = a.split('\n')
  const bLines = b.split('\n')
  const m = aLines.length
  const n = bLines.length

  // LCS via DP
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (aLines[i - 1] === bLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  const result: DiffItem[] = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aLines[i - 1] === bLines[j - 1]) {
      result.unshift({ type: 'equal', text: aLines[i - 1] })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'insert', text: bLines[j - 1] })
      j--
    } else {
      result.unshift({ type: 'delete', text: aLines[i - 1] })
      i--
    }
  }
  return result
}

const CompareDialog: React.FC<CompareDialogProps> = ({ editor, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [compareFileName, setCompareFileName] = useState('')
  const [diffResult, setDiffResult] = useState<DiffItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    setCompareFileName(file.name)
    setLoading(true)
    setError('')
    try {
      const mammoth = await import('mammoth')
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      const compareText = result.value
      const currentText = editor.getText()
      const diff = diffLines(currentText, compareText)
      setDiffResult(diff)
    } catch {
      setError('读取文件失败，请确认是有效的 .docx 文件')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[720px] max-w-[95vw] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">📄 文档比较</h2>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50">
          <span className="text-sm text-gray-600">原文档：当前编辑器内容</span>
          <span className="text-gray-400">VS</span>
          <button
            type="button"
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => fileInputRef.current?.click()}
          >
            选择比较文档…
          </button>
          {compareFileName && (
            <span className="text-sm text-gray-600 truncate max-w-[200px]">{compareFileName}</span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto px-5 py-3 font-mono text-sm">
          {loading && (
            <div className="text-center text-gray-500 py-8">正在读取文档…</div>
          )}
          {error && (
            <div className="text-red-600 py-4">{error}</div>
          )}
          {!loading && !error && diffResult === null && (
            <div className="text-center text-gray-400 py-8">请选择一个 .docx 文件以开始比较</div>
          )}
          {!loading && diffResult && (
            <div className="space-y-0.5">
              {diffResult.map((item, idx) => {
                if (item.type === 'equal') {
                  return (
                    <div key={idx} className="text-gray-600 px-2 py-0.5">
                      {item.text || '\u00a0'}
                    </div>
                  )
                }
                if (item.type === 'delete') {
                  return (
                    <div key={idx} className="bg-red-50 text-red-700 line-through px-2 py-0.5">
                      − {item.text || '\u00a0'}
                    </div>
                  )
                }
                return (
                  <div key={idx} className="bg-green-50 text-green-700 underline px-2 py-0.5">
                    + {item.text || '\u00a0'}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-3 border-t border-gray-200">
          <button
            type="button"
            className="px-4 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
            onClick={onClose}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

export default CompareDialog
