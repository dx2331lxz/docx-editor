/**
 * PageSetupDialog — modal for configuring paper size, orientation, and margins.
 * On confirm, calls onApply() with the new page config which is applied to the A4 canvas.
 */

import React, { useState } from 'react'
import { X } from 'lucide-react'

export interface PageConfig {
  paperSize: 'A4' | 'A3' | 'Letter'
  orientation: 'portrait' | 'landscape'
  marginTop: number    // cm
  marginBottom: number // cm
  marginLeft: number   // cm
  marginRight: number  // cm
}

/** Default A4 portrait with 2.54cm margins */
export const DEFAULT_PAGE_CONFIG: PageConfig = {
  paperSize: 'A4',
  orientation: 'portrait',
  marginTop: 2.54,
  marginBottom: 2.54,
  marginLeft: 2.54,
  marginRight: 2.54,
}

/** Paper dimensions in mm (portrait) */
const PAPER_SIZES: Record<PageConfig['paperSize'], { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 216, height: 279 },
}

/** Compute CSS dimensions for the page canvas */
export function getPageStyle(config: PageConfig): React.CSSProperties {
  const { width, height } = PAPER_SIZES[config.paperSize]
  const isLandscape = config.orientation === 'landscape'
  const w = isLandscape ? height : width
  const h = isLandscape ? width : height
  return {
    width: `${w}mm`,
    minHeight: `${h}mm`,
    paddingTop: `${config.marginTop}cm`,
    paddingBottom: `${config.marginBottom}cm`,
    paddingLeft: `${config.marginLeft}cm`,
    paddingRight: `${config.marginRight}cm`,
  }
}

interface PageSetupDialogProps {
  config: PageConfig
  onApply: (config: PageConfig) => void
  onClose: () => void
}

const inp = 'w-20 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500'
const label = 'text-sm text-gray-600 font-medium'

const PageSetupDialog: React.FC<PageSetupDialogProps> = ({ config, onApply, onClose }) => {
  const [form, setForm] = useState<PageConfig>({ ...config })

  const set = <K extends keyof PageConfig>(key: K, val: PageConfig[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }))

  const handleConfirm = () => {
    onApply(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-2xl w-[420px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">页面设置</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Paper size */}
          <div>
            <p className={`${label} mb-2`}>纸张大小</p>
            <div className="flex gap-2">
              {(['A4', 'A3', 'Letter'] as PageConfig['paperSize'][]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('paperSize', s)}
                  className={`flex-1 py-1.5 rounded border text-sm transition-colors ${
                    form.paperSize === s
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {(() => {
                const { width, height } = PAPER_SIZES[form.paperSize]
                const isL = form.orientation === 'landscape'
                return `${isL ? height : width} × ${isL ? width : height} mm`
              })()}
            </p>
          </div>

          {/* Orientation */}
          <div>
            <p className={`${label} mb-2`}>页面方向</p>
            <div className="flex gap-3">
              {([
                { val: 'portrait', label: '纵向 ↕' },
                { val: 'landscape', label: '横向 ↔' },
              ] as { val: PageConfig['orientation']; label: string }[]).map((o) => (
                <button
                  key={o.val}
                  type="button"
                  onClick={() => set('orientation', o.val)}
                  className={`flex-1 py-1.5 rounded border text-sm transition-colors ${
                    form.orientation === o.val
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Margins */}
          <div>
            <p className={`${label} mb-3`}>页边距（厘米）</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {([
                { key: 'marginTop', label: '上边距' },
                { key: 'marginBottom', label: '下边距' },
                { key: 'marginLeft', label: '左边距' },
                { key: 'marginRight', label: '右边距' },
              ] as { key: keyof PageConfig; label: string }[]).map(({ key, label: lbl }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 w-14 flex-shrink-0">{lbl}</span>
                  <input
                    type="number"
                    className={inp}
                    min={0}
                    max={10}
                    step={0.1}
                    value={form[key] as number}
                    onChange={(e) => set(key, parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-xs text-gray-400">cm</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preview mini */}
          <div>
            <p className={`${label} mb-2`}>预览</p>
            <div className="flex justify-center">
              {(() => {
                const { width, height } = PAPER_SIZES[form.paperSize]
                const isL = form.orientation === 'landscape'
                const pw = isL ? height : width
                const ph = isL ? width : height
                const scale = 80 / Math.max(pw, ph)
                const sw = pw * scale
                const sh = ph * scale
                const mt = (form.marginTop / (ph / 10)) * sh
                const mb = (form.marginBottom / (ph / 10)) * sh
                const ml = (form.marginLeft / (pw / 10)) * sw
                const mr = (form.marginRight / (pw / 10)) * sw
                return (
                  <div className="relative border border-gray-300 bg-white shadow-sm"
                    style={{ width: sw, height: sh }}>
                    <div className="absolute bg-blue-50 border border-dashed border-blue-200"
                      style={{ top: mt, bottom: mb, left: ml, right: mr }} />
                  </div>
                )
              })()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded border border-gray-300 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  )
}

export default PageSetupDialog
