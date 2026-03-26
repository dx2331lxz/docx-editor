/**
 * PageBorderDialog — controls the decorative border around the A4 page.
 */
import React, { useState } from 'react'
import { X } from 'lucide-react'

export interface PageBorderConfig {
  style: 'none' | 'box' | 'shadow' | '3d'
  lineStyle: 'solid' | 'dashed' | 'double' | 'wavy'
  color: string
  width: number // pt
}

export const DEFAULT_PAGE_BORDER: PageBorderConfig = {
  style: 'none',
  lineStyle: 'solid',
  color: '#374151',
  width: 1,
}

/** Returns CSS border string for the A4 page div */
export function getBorderStyle(cfg: PageBorderConfig): React.CSSProperties {
  if (cfg.style === 'none') return {}
  const px = cfg.width * 1.333 // pt → px approx
  const lineMap: Record<string, string> = {
    solid: 'solid', dashed: 'dashed', double: 'double', wavy: 'solid',
  }
  const borderStr = `${px.toFixed(1)}px ${lineMap[cfg.lineStyle]} ${cfg.color}`
  if (cfg.style === 'box') return { border: borderStr }
  if (cfg.style === 'shadow') return { border: borderStr, boxShadow: `4px 4px 0 ${cfg.color}` }
  if (cfg.style === '3d') return { border: borderStr, boxShadow: `2px 2px 0 ${cfg.color}, -2px -2px 0 #9ca3af` }
  return {}
}

const PRESETS = [
  { id: 'none', label: '无' },
  { id: 'box', label: '方框' },
  { id: 'shadow', label: '阴影' },
  { id: '3d', label: '三维' },
] as const

const LINE_STYLES = [
  { id: 'solid', label: '实线' },
  { id: 'dashed', label: '虚线' },
  { id: 'double', label: '双线' },
  { id: 'wavy', label: '波浪线' },
] as const

const COLORS = [
  '#374151', '#1e40af', '#7c3aed', '#be185d',
  '#047857', '#b45309', '#dc2626', '#000000',
  '#6b7280', '#93c5fd', '#a78bfa', '#f9a8d4',
]

interface PageBorderDialogProps {
  config: PageBorderConfig
  onApply: (cfg: PageBorderConfig) => void
  onClose: () => void
}

const PageBorderDialog: React.FC<PageBorderDialogProps> = ({ config, onApply, onClose }) => {
  const [cfg, setCfg] = useState<PageBorderConfig>({ ...config })

  const preview: React.CSSProperties = cfg.style !== 'none'
    ? { ...getBorderStyle(cfg), width: 80, height: 110, background: 'white', flexShrink: 0 }
    : { width: 80, height: 110, background: 'white', border: '1px dashed #d1d5db', flexShrink: 0 }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-2xl w-[480px] border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="font-semibold text-gray-800">页面边框</span>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="p-4 flex gap-4">
          {/* Left: settings */}
          <div className="flex-1 space-y-4">
            {/* Style presets */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">边框样式</p>
              <div className="grid grid-cols-4 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`h-10 rounded border text-xs transition-colors ${
                      cfg.style === p.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-400 text-gray-600'
                    }`}
                    onClick={() => setCfg((c) => ({ ...c, style: p.id }))}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Line style */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">线型</p>
              <div className="grid grid-cols-2 gap-2">
                {LINE_STYLES.map((ls) => (
                  <button
                    key={ls.id}
                    type="button"
                    className={`h-8 rounded border text-xs transition-colors ${
                      cfg.lineStyle === ls.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-400 text-gray-600'
                    }`}
                    onClick={() => setCfg((c) => ({ ...c, lineStyle: ls.id }))}
                  >
                    {ls.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">颜色</p>
              <div className="flex flex-wrap gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-6 h-6 rounded border-2 transition-transform ${cfg.color === c ? 'border-blue-500 scale-110' : 'border-gray-300'}`}
                    style={{ background: c }}
                    onClick={() => setCfg((prev) => ({ ...prev, color: c }))}
                  />
                ))}
                <input
                  type="color"
                  value={cfg.color}
                  onChange={(e) => setCfg((c) => ({ ...c, color: e.target.value }))}
                  className="w-6 h-6 rounded cursor-pointer border border-gray-300"
                  title="自定义颜色"
                />
              </div>
            </div>

            {/* Width */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">宽度：{cfg.width}pt</p>
              <input
                type="range"
                min={0.5}
                max={6}
                step={0.5}
                value={cfg.width}
                onChange={(e) => setCfg((c) => ({ ...c, width: parseFloat(e.target.value) }))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>0.5pt</span><span>6pt</span>
              </div>
            </div>
          </div>

          {/* Right: preview */}
          <div className="flex flex-col items-center justify-center gap-2 w-28">
            <p className="text-xs text-gray-500">预览</p>
            <div style={preview} className="rounded" />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button type="button" className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-100" onClick={onClose}>取消</button>
          <button type="button" className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700" onClick={() => { onApply(cfg); onClose() }}>确定</button>
        </div>
      </div>
    </div>
  )
}

export default PageBorderDialog
