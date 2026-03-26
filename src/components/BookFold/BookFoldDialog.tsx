/**
 * BookFoldDialog — 书籍折页设置
 * 将页面分为左右两半，打印后对折成册
 * 支持设置装订边距，提供折页预览
 */
import React, { useState } from 'react'

interface BookFoldDialogProps {
  onApply: (config: BookFoldConfig) => void
  onClose: () => void
  current: BookFoldConfig
}

export interface BookFoldConfig {
  enabled: boolean
  gutterWidth: number   // mm - extra binding margin
  paperSize: 'A4' | 'A5' | 'B5'
  orientation: 'portrait' | 'landscape'
  sheetsPerBooklet: number | 'all'
}

export const DEFAULT_BOOK_FOLD: BookFoldConfig = {
  enabled: false,
  gutterWidth: 10,
  paperSize: 'A4',
  orientation: 'portrait',
  sheetsPerBooklet: 'all',
}

const PAPER_DIMS: Record<string, [number, number]> = {
  A4: [210, 297],
  A5: [148, 210],
  B5: [176, 250],
}

const BookFoldDialog: React.FC<BookFoldDialogProps> = ({ onApply, onClose, current }) => {
  const [cfg, setCfg] = useState<BookFoldConfig>({ ...current })

  const [pw, ph] = PAPER_DIMS[cfg.paperSize]
  const isLandscape = cfg.orientation === 'landscape'
  const pageW = isLandscape ? ph : pw
  const pageH = isLandscape ? pw : ph

  // Scale for preview (fit in ~240px wide)
  const scale = 100 / pageW
  const previewW = pageW * scale
  const previewH = pageH * scale
  const halfW = previewW / 2
  const gutterPx = cfg.gutterWidth * scale

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[560px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-base font-semibold">书籍折页设置</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="p-5 space-y-4">
          <label className="flex items-center gap-3 text-sm font-medium">
            <input type="checkbox" checked={cfg.enabled}
              onChange={e => setCfg(c => ({ ...c, enabled: e.target.checked }))} />
            启用书籍折页模式
          </label>

          <div className="p-3 bg-blue-50 rounded text-xs text-blue-700">
            书籍折页模式会将页面分为左右两半，每张纸印两页。打印后将纸沿中线对折即可装订成册。
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">纸张大小</label>
              <select value={cfg.paperSize}
                onChange={e => setCfg(c => ({ ...c, paperSize: e.target.value as BookFoldConfig['paperSize'] }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="A4">A4 (210×297mm)</option>
                <option value="A5">A5 (148×210mm)</option>
                <option value="B5">B5 (176×250mm)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">纸张方向</label>
              <select value={cfg.orientation}
                onChange={e => setCfg(c => ({ ...c, orientation: e.target.value as BookFoldConfig['orientation'] }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="portrait">纵向</option>
                <option value="landscape">横向</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              装订边距 ({cfg.gutterWidth}mm)
              <span className="ml-2 text-gray-400">— 对折线两侧的额外留白</span>
            </label>
            <input type="range" min="0" max="30" value={cfg.gutterWidth}
              onChange={e => setCfg(c => ({ ...c, gutterWidth: parseInt(e.target.value) }))}
              className="w-full" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">每本页数</label>
            <select
              value={cfg.sheetsPerBooklet === 'all' ? 'all' : String(cfg.sheetsPerBooklet)}
              onChange={e => setCfg(c => ({
                ...c,
                sheetsPerBooklet: e.target.value === 'all' ? 'all' : parseInt(e.target.value)
              }))}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="all">全部页面</option>
              <option value="4">4页/本</option>
              <option value="8">8页/本</option>
              <option value="16">16页/本</option>
              <option value="32">32页/本</option>
            </select>
          </div>

          {/* Visual preview */}
          <div>
            <div className="text-xs text-gray-500 mb-2">折页效果预览</div>
            <div className="flex gap-6 items-start">
              {/* Single sheet - before folding */}
              <div>
                <div className="text-xs text-gray-400 text-center mb-1">打印时（一张纸）</div>
                <div className="bg-white border border-gray-300 shadow-sm mx-auto relative"
                  style={{ width: previewW, height: previewH }}>
                  {/* Left page */}
                  <div className="absolute border-r border-dashed border-gray-400 flex items-center justify-center text-gray-300"
                    style={{ left: 0, top: 0, width: halfW - gutterPx / 2, height: '100%', fontSize: 8 }}>
                    第2页
                  </div>
                  {/* Gutter / fold line */}
                  <div className="absolute flex items-center justify-center"
                    style={{ left: halfW - gutterPx / 2, top: 0, width: gutterPx, height: '100%' }}>
                    <div style={{ width: 1, height: '100%', background: 'repeating-linear-gradient(to bottom, #9ca3af 0px, #9ca3af 4px, transparent 4px, transparent 8px)' }} />
                  </div>
                  {/* Right page */}
                  <div className="absolute flex items-center justify-center text-gray-300"
                    style={{ left: halfW + gutterPx / 2, top: 0, width: halfW - gutterPx / 2, height: '100%', fontSize: 8 }}>
                    第1页
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="self-center text-2xl text-gray-400 mt-4">→</div>

              {/* After folding */}
              <div>
                <div className="text-xs text-gray-400 text-center mb-1">对折后（小册子）</div>
                <div className="bg-white border border-gray-300 shadow-md mx-auto relative"
                  style={{ width: halfW + 4, height: previewH }}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-gray-300"
                    style={{ fontSize: 8 }}>
                    <div>第1页</div>
                    <div className="text-gray-200">（翻页后为第2页）</div>
                  </div>
                  {/* Binding edge */}
                  <div className="absolute left-0 top-0 bottom-0"
                    style={{ width: 4, background: 'linear-gradient(90deg, #d1d5db, #f9fafb)' }} />
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400 text-center">
              折叠线间距 {cfg.gutterWidth}mm · 折叠后页面 {Math.round(pageW / 2)}×{pageH}mm
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t bg-gray-50">
          <button className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
            onClick={() => { onApply({ ...DEFAULT_BOOK_FOLD }); onClose() }}>清除</button>
          <button className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
            onClick={onClose}>取消</button>
          <button className="px-6 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => { onApply(cfg); onClose() }}>应用</button>
        </div>
      </div>
    </div>
  )
}

export default BookFoldDialog
