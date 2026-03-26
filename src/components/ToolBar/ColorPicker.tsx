import React, { useState, useRef, useEffect } from 'react'

interface ColorPickerProps {
  icon: React.ReactNode
  color: string
  onChange: (color: string) => void
  title: string
}

const PRESET_COLORS = [
  // Row 1 — Blacks / grays / whites
  '#000000', '#222222', '#444444', '#666666', '#888888', '#aaaaaa', '#cccccc', '#ffffff',
  // Row 2 — Reds / oranges / yellows
  '#c00000', '#ff0000', '#ff4500', '#ff9900', '#ffcc00', '#ffff00', '#e6e600', '#cccc00',
  // Row 3 — Greens
  '#00b050', '#00cc00', '#00ff00', '#92d050', '#70ad47', '#375623', '#264d1f', '#1a3513',
  // Row 4 — Blues / purples
  '#0070c0', '#0000ff', '#00b0f0', '#00ccff', '#4472c4', '#2e75b6', '#9900ff', '#7030a0',
  // Row 5 — Pastels / others
  '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#cfe2f3', '#d9d2e9', '#fce4ec', '#e2efda',
]

const ColorPicker: React.FC<ColorPickerProps> = ({ icon, color, onChange, title }) => {
  const [open, setOpen] = useState(false)
  const [hexInput, setHexInput] = useState(color)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) setHexInput(color)
  }, [color, open])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const apply = (c: string, close = false) => {
    onChange(c)
    setHexInput(c)
    if (close) setOpen(false)
  }

  const handleHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setHexInput(val)
    if (/^#[0-9a-fA-F]{6}$/.test(val)) onChange(val)
  }

  const handleHexKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (/^#[0-9a-fA-F]{6}$/.test(hexInput)) {
        apply(hexInput, true)
      }
    }
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger button — icon + color bar */}
      <button
        type="button"
        className="inline-flex flex-col items-center justify-center w-8 h-7 rounded text-gray-600 hover:bg-gray-200 transition-colors gap-0"
        title={title}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center justify-center h-4 leading-none">{icon}</span>
        {/* Color bar */}
        <span
          className="w-5 h-[3px] rounded-[1px] flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      </button>

      {/* Color panel */}
      {open && (
        <div className="absolute top-full left-0 mt-0.5 bg-white border border-gray-200 shadow-xl rounded-lg p-3 z-50 w-56">
          <p className="text-[11px] text-gray-400 mb-1.5 font-medium uppercase tracking-wide">标准颜色</p>
          <div className="grid grid-cols-8 gap-1 mb-3">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="w-5 h-5 rounded transition-transform hover:scale-125 hover:z-10 relative"
                style={{
                  backgroundColor: c,
                  outline: c.toLowerCase() === color.toLowerCase() ? '2px solid #1a73e8' : '1px solid rgba(0,0,0,0.1)',
                  outlineOffset: c.toLowerCase() === color.toLowerCase() ? '1px' : '0px',
                }}
                title={c}
                onClick={() => apply(c, true)}
              />
            ))}
          </div>

          <p className="text-[11px] text-gray-400 mb-1.5 font-medium uppercase tracking-wide">自定义颜色</p>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : '#000000'}
              onChange={(e) => apply(e.target.value)}
              className="w-8 h-7 rounded border border-gray-300 cursor-pointer p-0.5 flex-shrink-0"
            />
            <input
              type="text"
              value={hexInput}
              onChange={handleHexInput}
              onKeyDown={handleHexKeyDown}
              className="flex-1 h-7 px-2 rounded border border-gray-300 text-xs font-mono focus:outline-none focus:border-blue-400"
              placeholder="#rrggbb"
              maxLength={7}
            />
            <button
              type="button"
              className="h-7 px-2 rounded bg-blue-600 text-white text-xs hover:bg-blue-700 transition-colors"
              onClick={() => apply(hexInput, true)}
            >确认</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ColorPicker
