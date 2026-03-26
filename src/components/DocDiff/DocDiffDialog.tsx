import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'

interface DocDiffDialogProps {
  editor: Editor | null
  onClose: () => void
}

type DiffOp = { type: 'equal' | 'delete' | 'insert'; line: string }

function computeDiff(oldText: string, newText: string): DiffOp[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const m = oldLines.length
  const n = newLines.length

  // LCS DP
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack
  const result: DiffOp[] = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.push({ type: 'equal', line: oldLines[i - 1] })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'insert', line: newLines[j - 1] })
      j--
    } else {
      result.push({ type: 'delete', line: oldLines[i - 1] })
      i--
    }
  }
  return result.reverse()
}

const DocDiffDialog: React.FC<DocDiffDialogProps> = ({ editor, onClose }) => {
  const [oldText, setOldText] = useState('')
  const [diffResult, setDiffResult] = useState<DiffOp[] | null>(null)

  const handleCompare = () => {
    const newText = editor ? editor.state.doc.textContent : ''
    setDiffResult(computeDiff(oldText, newText))
  }

  const lineStyle = (type: DiffOp['type']): React.CSSProperties => {
    if (type === 'delete') return { background: '#fee2e2', textDecoration: 'line-through', color: '#991b1b' }
    if (type === 'insert') return { background: '#dcfce7', color: '#166534' }
    return {}
  }

  const linePrefix = (type: DiffOp['type']) => {
    if (type === 'delete') return '− '
    if (type === 'insert') return '+ '
    return '  '
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-2xl w-[820px] max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-gray-700 to-gray-900 rounded-t-lg">
          <h2 className="text-white font-semibold text-base">🔍 版本对比</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-lg font-bold">×</button>
        </div>

        <div className="flex flex-1 overflow-hidden gap-4 p-4">
          {/* Left: old version input */}
          <div className="flex flex-col w-1/2">
            <label className="text-sm font-semibold text-gray-700 mb-1">旧版本文本</label>
            <textarea
              className="flex-1 border border-gray-300 rounded p-2 text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="粘贴旧版本文本到此处…"
              value={oldText}
              onChange={e => setOldText(e.target.value)}
              style={{ minHeight: '300px' }}
            />
          </div>

          {/* Right: diff result */}
          <div className="flex flex-col w-1/2">
            <label className="text-sm font-semibold text-gray-700 mb-1">对比结果</label>
            <div
              className="flex-1 border border-gray-300 rounded p-2 text-sm font-mono overflow-y-auto bg-gray-50"
              style={{ minHeight: '300px' }}
            >
              {diffResult === null ? (
                <p className="text-gray-400 italic">点击"对比"按钮查看差异</p>
              ) : diffResult.length === 0 ? (
                <p className="text-green-600">两个版本完全相同</p>
              ) : (
                diffResult.map((op, idx) => (
                  <div key={idx} style={lineStyle(op.type)} className="whitespace-pre-wrap px-1 py-0.5 rounded-sm mb-0.5">
                    <span className="opacity-60 select-none">{linePrefix(op.type)}</span>
                    {op.line || <span className="opacity-30">（空行）</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {diffResult && (
          <div className="px-4 pb-1 flex gap-4 text-xs text-gray-500">
            <span style={{ color: '#991b1b' }}>■ 删除：{diffResult.filter(d => d.type === 'delete').length} 行</span>
            <span style={{ color: '#166534' }}>■ 新增：{diffResult.filter(d => d.type === 'insert').length} 行</span>
            <span>■ 不变：{diffResult.filter(d => d.type === 'equal').length} 行</span>
          </div>
        )}

        <div className="flex justify-end gap-2 px-4 py-3 border-t bg-gray-50 rounded-b-lg">
          <button onClick={onClose} className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100">关闭</button>
          <button
            onClick={handleCompare}
            className="px-4 py-1.5 text-sm bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            对比
          </button>
        </div>
      </div>
    </div>
  )
}

export default DocDiffDialog
