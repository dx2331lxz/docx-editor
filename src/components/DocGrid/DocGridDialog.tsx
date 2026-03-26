import React, { useState } from 'react'

export interface DocGridConfig {
  enabled: boolean
  mode: 'none' | 'lines' | 'chars'
  charsPerLine: number
  linesPerPage: number
  showGrid: boolean
}

export const DEFAULT_DOC_GRID: DocGridConfig = {
  enabled: false,
  mode: 'none',
  charsPerLine: 28,
  linesPerPage: 29,
  showGrid: false,
}

interface Props {
  config: DocGridConfig
  onApply: (c: DocGridConfig) => void
  onClose: () => void
}

const DocGridDialog: React.FC<Props> = ({ config, onApply, onClose }) => {
  const [local, setLocal] = useState<DocGridConfig>(config)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">文档网格</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <p className="font-medium mb-2">网格模式</p>
            {(['none', 'lines', 'chars'] as const).map(m => (
              <label key={m} className="flex items-center gap-2 mb-1 cursor-pointer">
                <input type="radio" checked={local.mode === m} onChange={() => setLocal(p => ({ ...p, mode: m, enabled: m !== 'none' }))} />
                {m === 'none' ? '无网格' : m === 'lines' ? '只指定行网格' : '指定行和字符网格'}
              </label>
            ))}
          </div>

          {local.mode !== 'none' && (
            <div className="space-y-2 border-t pt-3">
              {local.mode === 'chars' && (
                <div className="flex items-center gap-3">
                  <label className="w-24 text-gray-600">每行字符数</label>
                  <input type="number" min={10} max={60} value={local.charsPerLine}
                    onChange={e => setLocal(p => ({ ...p, charsPerLine: Number(e.target.value) }))}
                    className="w-20 border border-gray-300 rounded px-2 py-1 text-sm" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <label className="w-24 text-gray-600">每页行数</label>
                <input type="number" min={10} max={60} value={local.linesPerPage}
                  onChange={e => setLocal(p => ({ ...p, linesPerPage: Number(e.target.value) }))}
                  className="w-20 border border-gray-300 rounded px-2 py-1 text-sm" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={local.showGrid}
                  onChange={e => setLocal(p => ({ ...p, showGrid: e.target.checked }))} />
                显示网格线
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50">取消</button>
          <button onClick={() => { onApply(local); onClose() }} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">确定</button>
        </div>
      </div>
    </div>
  )
}

export default DocGridDialog
