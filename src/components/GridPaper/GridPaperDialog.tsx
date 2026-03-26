/**
 * GridPaperDialog — 稿纸设置
 * 方格稿纸 / 横线稿纸 / 空白稿纸 / 米字格
 * 网格大小、线条颜色、边框样式
 * 生成 CSS 背景叠加到编辑区
 */
import React, { useState } from 'react'

interface GridPaperDialogProps {
  onApply: (config: GridPaperConfig) => void
  onClose: () => void
  current: GridPaperConfig
}

export interface GridPaperConfig {
  enabled: boolean
  type: 'square' | 'lined' | 'blank' | 'manuscript'
  cellWidth: number
  cellHeight: number
  lineColor: string
  borderColor: string
  bgColor: string
  showBorder: boolean
}

export const DEFAULT_GRID_PAPER: GridPaperConfig = {
  enabled: false,
  type: 'square',
  cellWidth: 28,
  cellHeight: 28,
  lineColor: '#d1d5db',
  borderColor: '#9ca3af',
  bgColor: '#fffef7',
  showBorder: true,
}

export function buildGridCss(cfg: GridPaperConfig): React.CSSProperties {
  if (!cfg.enabled) return {}
  const { cellWidth: cw, cellHeight: ch, lineColor: lc, borderColor: bc, bgColor } = cfg

  if (cfg.type === 'blank') return { backgroundColor: bgColor }

  if (cfg.type === 'lined') {
    return {
      backgroundColor: bgColor,
      backgroundImage: `linear-gradient(${lc} 1px, transparent 1px)`,
      backgroundSize: `100% ${ch}px`,
      backgroundPosition: `0 ${ch - 1}px`,
    }
  }

  if (cfg.type === 'manuscript') {
    // Cross-hair cells (米字格 style)
    return {
      backgroundColor: bgColor,
      backgroundImage: [
        `linear-gradient(${lc} 1px, transparent 1px)`,
        `linear-gradient(90deg, ${lc} 1px, transparent 1px)`,
        `linear-gradient(${bc} 1px, transparent 1px)`,
        `linear-gradient(90deg, ${bc} 1px, transparent 1px)`,
        `linear-gradient(${lc} 0.5px, transparent 0.5px)`,
        `linear-gradient(90deg, ${lc} 0.5px, transparent 0.5px)`,
      ].join(', '),
      backgroundSize: [
        `${cw / 2}px ${ch / 2}px`,
        `${cw / 2}px ${ch / 2}px`,
        `${cw}px ${ch}px`,
        `${cw}px ${ch}px`,
        `${cw}px ${ch / 2}px`,
        `${cw / 2}px ${ch}px`,
      ].join(', '),
    }
  }

  // Square grid
  return {
    backgroundColor: bgColor,
    backgroundImage: [
      `linear-gradient(${lc} 1px, transparent 1px)`,
      `linear-gradient(90deg, ${lc} 1px, transparent 1px)`,
      `linear-gradient(${bc} 1px, transparent 1px)`,
      `linear-gradient(90deg, ${bc} 1px, transparent 1px)`,
    ].join(', '),
    backgroundSize: [
      `${cw / 4}px ${ch / 4}px`,
      `${cw / 4}px ${ch / 4}px`,
      `${cw}px ${ch}px`,
      `${cw}px ${ch}px`,
    ].join(', '),
  }
}

const PRESETS = [
  { label: '20×20 (常规)', cw: 28, ch: 28 },
  { label: '15×20 (窄格)', cw: 21, ch: 28 },
  { label: '10×20 (小格)', cw: 14, ch: 28 },
  { label: '大格 (36×36)', cw: 36, ch: 36 },
]

const GridPaperDialog: React.FC<GridPaperDialogProps> = ({ onApply, onClose, current }) => {
  const [cfg, setCfg] = useState<GridPaperConfig>({ ...current })

  const previewCss: React.CSSProperties = {
    width: 200, height: 140,
    border: `1px solid ${cfg.showBorder ? cfg.borderColor : '#e5e7eb'}`,
    ...buildGridCss({ ...cfg, enabled: true }),
    position: 'relative', overflow: 'hidden', flexShrink: 0,
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[540px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-base font-semibold">稿纸设置</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="p-5 space-y-4">
          <label className="flex items-center gap-3 text-sm font-medium">
            <input type="checkbox" checked={cfg.enabled}
              onChange={e => setCfg(c => ({ ...c, enabled: e.target.checked }))} />
            启用稿纸背景
          </label>

          {/* Type selector */}
          <div>
            <div className="text-xs text-gray-500 mb-2">稿纸类型</div>
            <div className="grid grid-cols-4 gap-2">
              {([
                { v: 'square', label: '方格稿纸', icon: '⊞' },
                { v: 'manuscript', label: '米字格', icon: '⊠' },
                { v: 'lined', label: '横线稿纸', icon: '≡' },
                { v: 'blank', label: '空白稿纸', icon: '□' },
              ] as const).map(({ v, label, icon }) => (
                <button key={v}
                  className={`py-2 px-1 rounded border-2 text-center transition-all ${cfg.type === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300'}`}
                  onClick={() => setCfg(c => ({ ...c, type: v }))}>
                  <div className="text-xl">{icon}</div>
                  <div className="text-xs">{label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Presets */}
          {(cfg.type === 'square' || cfg.type === 'manuscript') && (
            <div>
              <div className="text-xs text-gray-500 mb-2">网格大小</div>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map(p => (
                  <button key={p.label}
                    className={`px-3 py-1 text-xs rounded border ${cfg.cellWidth === p.cw && cfg.cellHeight === p.ch ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 hover:border-gray-400'}`}
                    onClick={() => setCfg(c => ({ ...c, cellWidth: p.cw, cellHeight: p.ch }))}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size sliders */}
          {cfg.type !== 'blank' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">格宽 ({cfg.cellWidth}px)</label>
                <input type="range" min="10" max="60" value={cfg.cellWidth}
                  onChange={e => setCfg(c => ({ ...c, cellWidth: parseInt(e.target.value) }))} className="w-full" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">格高 ({cfg.cellHeight}px)</label>
                <input type="range" min="10" max="60" value={cfg.cellHeight}
                  onChange={e => setCfg(c => ({ ...c, cellHeight: parseInt(e.target.value) }))} className="w-full" />
              </div>
            </div>
          )}

          {/* Colors + preview side by side */}
          <div className="flex gap-5">
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'lineColor' as const, label: '线条色' },
                  { key: 'borderColor' as const, label: '边框色' },
                  { key: 'bgColor' as const, label: '背景色' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-500 mb-1">{label}</label>
                    <input type="color" value={cfg[key]}
                      onChange={e => setCfg(c => ({ ...c, [key]: e.target.value }))}
                      className="w-full h-8 rounded border cursor-pointer" />
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={cfg.showBorder}
                  onChange={e => setCfg(c => ({ ...c, showBorder: e.target.checked }))} />
                显示外框线
              </label>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">预览</div>
              <div style={previewCss}>
                <span style={{ position: 'absolute', bottom: 4, right: 4, fontSize: 10, color: '#9ca3af' }}>预览</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t bg-gray-50">
          <button className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
            onClick={() => { onApply({ ...DEFAULT_GRID_PAPER }); onClose() }}>清除</button>
          <button className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
            onClick={onClose}>取消</button>
          <button className="px-6 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => { onApply(cfg); onClose() }}>应用</button>
        </div>
      </div>
    </div>
  )
}

export default GridPaperDialog
