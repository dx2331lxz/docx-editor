/**
 * WatermarkDialog — configure text or image watermark for the A4 page.
 */
import React, { useState } from 'react'
import { X } from 'lucide-react'

export type WatermarkType = 'none' | 'text' | 'image'

export interface WatermarkConfig {
  type: WatermarkType
  // text watermark
  text: string
  fontSize: number
  color: string
  opacity: number
  angle: number // degrees, typically 45 or 0
  // image watermark
  imageDataUrl: string
  imageOpacity: number
}

export const DEFAULT_WATERMARK: WatermarkConfig = {
  type: 'none',
  text: '机密',
  fontSize: 72,
  color: '#d1d5db',
  opacity: 0.25,
  angle: -45,
  imageDataUrl: '',
  imageOpacity: 0.2,
}

interface WatermarkDialogProps {
  config: WatermarkConfig
  onApply: (cfg: WatermarkConfig) => void
  onClose: () => void
}

const PRESET_TEXTS = ['机密', '内部资料', '草稿', 'CONFIDENTIAL', 'DRAFT', '样本']
const PRESET_COLORS = ['#d1d5db', '#9ca3af', '#ef4444', '#f97316', '#3b82f6', '#8b5cf6']

const WatermarkDialog: React.FC<WatermarkDialogProps> = ({ config, onApply, onClose }) => {
  const [cfg, setCfg] = useState<WatermarkConfig>({ ...config })

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCfg((c) => ({ ...c, imageDataUrl: ev.target?.result as string, type: 'image' }))
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-2xl w-[460px] border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="font-semibold text-gray-800">水印设置</span>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Type selector */}
          <div className="flex gap-2">
            {(['none', 'text', 'image'] as WatermarkType[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`flex-1 py-2 rounded border text-sm transition-colors ${cfg.type === t ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}
                onClick={() => setCfg((c) => ({ ...c, type: t }))}
              >
                {t === 'none' ? '无水印' : t === 'text' ? '文字水印' : '图片水印'}
              </button>
            ))}
          </div>

          {cfg.type === 'text' && (
            <div className="space-y-3">
              {/* Preset texts */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1.5">预设文字</p>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_TEXTS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`px-2 py-1 rounded text-xs border transition-colors ${cfg.text === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-400 text-gray-600'}`}
                      onClick={() => setCfg((c) => ({ ...c, text: t }))}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-600 block mb-1">自定义文字</label>
                  <input
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={cfg.text}
                    onChange={(e) => setCfg((c) => ({ ...c, text: e.target.value }))}
                    placeholder="输入水印文字"
                  />
                </div>
                <div className="w-20">
                  <label className="text-xs font-medium text-gray-600 block mb-1">字号</label>
                  <input
                    type="number"
                    min={24} max={200}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={cfg.fontSize}
                    onChange={(e) => setCfg((c) => ({ ...c, fontSize: parseInt(e.target.value) || 72 }))}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-600 mb-1.5">颜色</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`w-6 h-6 rounded border-2 transition-transform ${cfg.color === c ? 'border-blue-500 scale-110' : 'border-gray-300'}`}
                      style={{ background: c }}
                      onClick={() => setCfg((prev) => ({ ...prev, color: c }))}
                    />
                  ))}
                  <input type="color" value={cfg.color} onChange={(e) => setCfg((c) => ({ ...c, color: e.target.value }))} className="w-6 h-6 rounded cursor-pointer border border-gray-300" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">透明度：{Math.round(cfg.opacity * 100)}%</label>
                  <input type="range" min={0.05} max={0.8} step={0.05} value={cfg.opacity}
                    onChange={(e) => setCfg((c) => ({ ...c, opacity: parseFloat(e.target.value) }))} className="w-full" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">方向</p>
                  <div className="flex gap-2">
                    <button type="button" className={`flex-1 py-1.5 rounded border text-xs ${cfg.angle === -45 ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}
                      onClick={() => setCfg((c) => ({ ...c, angle: -45 }))}>斜45°</button>
                    <button type="button" className={`flex-1 py-1.5 rounded border text-xs ${cfg.angle === 0 ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}
                      onClick={() => setCfg((c) => ({ ...c, angle: 0 }))}>水平</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {cfg.type === 'image' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">上传图片</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm text-gray-600" />
              </div>
              {cfg.imageDataUrl && (
                <div className="flex items-center gap-3">
                  <img src={cfg.imageDataUrl} alt="watermark preview" className="w-24 h-16 object-contain border rounded" style={{ opacity: cfg.imageOpacity }} />
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-600 block mb-1">透明度：{Math.round(cfg.imageOpacity * 100)}%</label>
                    <input type="range" min={0.05} max={0.8} step={0.05} value={cfg.imageOpacity}
                      onChange={(e) => setCfg((c) => ({ ...c, imageOpacity: parseFloat(e.target.value) }))} className="w-full" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preview strip */}
          {cfg.type !== 'none' && (
            <div className="border rounded h-20 bg-white relative overflow-hidden flex items-center justify-center">
              <span className="text-xs text-gray-400 absolute top-1 left-2">预览</span>
              {cfg.type === 'text' && (
                <span style={{
                  color: cfg.color, fontSize: `${Math.min(cfg.fontSize * 0.3, 36)}px`,
                  opacity: cfg.opacity, transform: `rotate(${cfg.angle}deg)`,
                  fontWeight: 'bold', whiteSpace: 'nowrap', userSelect: 'none',
                }}>{cfg.text}</span>
              )}
              {cfg.type === 'image' && cfg.imageDataUrl && (
                <img src={cfg.imageDataUrl} alt="preview" style={{ opacity: cfg.imageOpacity, maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button type="button" className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-100" onClick={onClose}>取消</button>
          <button type="button" className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => { onApply(cfg); onClose() }}>确定</button>
        </div>
      </div>
    </div>
  )
}

export default WatermarkDialog
