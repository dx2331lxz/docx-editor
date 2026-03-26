import React, { useState } from 'react'

export type PageBgType = 'none' | 'solid' | 'gradient1' | 'gradient2'

export interface PageBgConfig {
  type: PageBgType
  color: string
}

export const DEFAULT_PAGE_BG: PageBgConfig = { type: 'none', color: '#ffffff' }

export function getPageBgStyle(cfg: PageBgConfig): React.CSSProperties {
  if (cfg.type === 'none') return { background: 'white' }
  if (cfg.type === 'solid') return { background: cfg.color }
  if (cfg.type === 'gradient1') return { background: `linear-gradient(135deg, ${cfg.color} 0%, white 100%)` }
  if (cfg.type === 'gradient2') return { background: `linear-gradient(to bottom, ${cfg.color} 0%, white 60%)` }
  return { background: 'white' }
}

interface Props {
  config: PageBgConfig
  onApply: (c: PageBgConfig) => void
  onClose: () => void
}

const PRESETS: { type: PageBgType; label: string; preview: string }[] = [
  { type: 'none',      label: '无填充',   preview: 'white' },
  { type: 'solid',     label: '纯色',     preview: '#e0f2fe' },
  { type: 'gradient1', label: '渐变（斜向）', preview: 'linear-gradient(135deg,#dbeafe 0%,white 100%)' },
  { type: 'gradient2', label: '渐变（顶部）', preview: 'linear-gradient(to bottom,#dbeafe 0%,white 60%)' },
]

const PageBackgroundDialog: React.FC<Props> = ({ config, onApply, onClose }) => {
  const [local, setLocal] = useState<PageBgConfig>(config)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-80 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">页面颜色</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        <div className="space-y-2 mb-4">
          {PRESETS.map(p => (
            <label key={p.type} className={`flex items-center gap-3 p-2 rounded border cursor-pointer transition-colors ${local.type === p.type ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" checked={local.type === p.type} onChange={() => setLocal(v => ({ ...v, type: p.type }))} className="sr-only" />
              <div className="w-8 h-8 rounded border border-gray-200 flex-shrink-0" style={{ background: p.preview }} />
              <span className="text-sm">{p.label}</span>
            </label>
          ))}
        </div>

        {(local.type === 'solid' || local.type === 'gradient1' || local.type === 'gradient2') && (
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm text-gray-600 w-16">颜色</label>
            <input type="color" value={local.color}
              onChange={e => setLocal(v => ({ ...v, color: e.target.value }))}
              className="w-10 h-8 rounded border border-gray-300 cursor-pointer" />
            <span className="text-sm text-gray-500">{local.color}</span>
          </div>
        )}

        <p className="text-xs text-gray-400 mb-4">提示：背景色仅用于屏幕显示，打印时不输出。</p>

        {/* Live preview */}
        <div className="mb-4 border border-gray-200 rounded overflow-hidden h-20 relative">
          <div className="absolute inset-0" style={getPageBgStyle(local)} />
          <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 mix-blend-multiply">预览</span>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50">取消</button>
          <button onClick={() => { onApply(local); onClose() }}
            className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">确定</button>
        </div>
      </div>
    </div>
  )
}

export default PageBackgroundDialog
