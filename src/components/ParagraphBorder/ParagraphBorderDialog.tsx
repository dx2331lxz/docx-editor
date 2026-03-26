/**
 * ParagraphBorderDialog — 段落边框和底纹（增强版）
 * 7种边框样式，每边独立设置，颜色宽度，填充背景色，实时预览
 */
import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'

interface ParagraphBorderDialogProps {
  editor: Editor | null
  onClose: () => void
}

type BorderStyle = 'none' | 'solid' | 'double' | 'dashed' | 'dotted' | 'wavy' | 'ridge' | 'inset'

interface BorderSide {
  style: BorderStyle
  width: number
  color: string
}

interface BorderConfig {
  top: BorderSide
  bottom: BorderSide
  left: BorderSide
  right: BorderSide
  bgColor: string
  padding: number
  applyTo: 'paragraph' | 'text' | 'page'
}

const DEFAULT_SIDE: BorderSide = { style: 'none', width: 1, color: '#374151' }

const DEFAULT_CONFIG: BorderConfig = {
  top: { ...DEFAULT_SIDE },
  bottom: { ...DEFAULT_SIDE },
  left: { ...DEFAULT_SIDE },
  right: { ...DEFAULT_SIDE },
  bgColor: 'transparent',
  padding: 4,
  applyTo: 'paragraph',
}

const STYLE_OPTIONS: { value: BorderStyle; label: string; css: string }[] = [
  { value: 'none', label: '无', css: 'none' },
  { value: 'solid', label: '单线', css: 'solid' },
  { value: 'double', label: '双线', css: 'double' },
  { value: 'dashed', label: '虚线', css: 'dashed' },
  { value: 'dotted', label: '点线', css: 'dotted' },
  { value: 'wavy', label: '波浪线', css: 'wavy' },
  { value: 'ridge', label: '立体框', css: 'ridge' },
  { value: 'inset', label: '阴影框', css: 'inset' },
]

const PRESET_COMBOS: { label: string; icon: string; cfg: Partial<BorderConfig> }[] = [
  { label: '无边框', icon: '☐', cfg: { top: { ...DEFAULT_SIDE }, bottom: { ...DEFAULT_SIDE }, left: { ...DEFAULT_SIDE }, right: { ...DEFAULT_SIDE } } },
  { label: '方框', icon: '⬜', cfg: { top: { style: 'solid', width: 1, color: '#374151' }, bottom: { style: 'solid', width: 1, color: '#374151' }, left: { style: 'solid', width: 1, color: '#374151' }, right: { style: 'solid', width: 1, color: '#374151' } } },
  { label: '阴影', icon: '▫', cfg: { top: { style: 'solid', width: 1, color: '#374151' }, bottom: { style: 'inset', width: 3, color: '#6b7280' }, left: { style: 'solid', width: 1, color: '#374151' }, right: { style: 'inset', width: 3, color: '#6b7280' } } },
  { label: '下划线', icon: '▬', cfg: { top: { ...DEFAULT_SIDE }, bottom: { style: 'solid', width: 2, color: '#1d4ed8' }, left: { ...DEFAULT_SIDE }, right: { ...DEFAULT_SIDE } } },
  { label: '左竖线', icon: '|', cfg: { top: { ...DEFAULT_SIDE }, bottom: { ...DEFAULT_SIDE }, left: { style: 'solid', width: 3, color: '#2563eb' }, right: { ...DEFAULT_SIDE } } },
  { label: '双线框', icon: '⊞', cfg: { top: { style: 'double', width: 3, color: '#374151' }, bottom: { style: 'double', width: 3, color: '#374151' }, left: { style: 'double', width: 3, color: '#374151' }, right: { style: 'double', width: 3, color: '#374151' } } },
]

function sideToCSS(side: BorderSide): string {
  if (side.style === 'none') return 'none'
  const cssStyle = side.style === 'wavy' ? 'wavy' : side.style
  return `${side.width}px ${cssStyle} ${side.color}`
}

const SideEditor: React.FC<{
  label: string
  side: BorderSide
  onChange: (s: BorderSide) => void
}> = ({ label, side, onChange }) => (
  <div className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
    <span className="text-xs text-gray-500 w-6 text-center flex-shrink-0">{label}</span>
    <select
      className="text-xs border border-gray-200 rounded px-1 py-0.5 flex-1"
      value={side.style}
      onChange={e => onChange({ ...side, style: e.target.value as BorderStyle })}>
      {STYLE_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    <input type="number" min="1" max="8" value={side.width}
      onChange={e => onChange({ ...side, width: parseInt(e.target.value) || 1 })}
      className="text-xs border border-gray-200 rounded px-1 py-0.5 w-10" />
    <input type="color" value={side.color}
      onChange={e => onChange({ ...side, color: e.target.value })}
      className="w-7 h-6 rounded border cursor-pointer flex-shrink-0" />
  </div>
)

const ParagraphBorderDialog: React.FC<ParagraphBorderDialogProps> = ({ editor, onClose }) => {
  const [cfg, setCfg] = useState<BorderConfig>({ ...DEFAULT_CONFIG })

  const applyPreset = (preset: Partial<BorderConfig>) => {
    setCfg(c => ({ ...c, ...preset }))
  }

  const previewStyle: React.CSSProperties = {
    borderTop: sideToCSS(cfg.top),
    borderBottom: sideToCSS(cfg.bottom),
    borderLeft: sideToCSS(cfg.left),
    borderRight: sideToCSS(cfg.right),
    backgroundColor: cfg.bgColor === 'transparent' ? undefined : cfg.bgColor,
    padding: cfg.padding,
    fontSize: 13,
    lineHeight: 1.6,
    color: '#374151',
  }

  const apply = () => {
    if (!editor) return
    const styleStr = [
      `border-top:${sideToCSS(cfg.top)}`,
      `border-bottom:${sideToCSS(cfg.bottom)}`,
      `border-left:${sideToCSS(cfg.left)}`,
      `border-right:${sideToCSS(cfg.right)}`,
      cfg.bgColor !== 'transparent' ? `background-color:${cfg.bgColor}` : '',
      `padding:${cfg.padding}px`,
      'display:block',
    ].filter(Boolean).join(';')

    const { from, to } = editor.state.selection
    const text = editor.state.doc.textBetween(from, to, '\n') || '段落文本'

    if (cfg.applyTo === 'paragraph') {
      editor.chain().focus().insertContent(
        `<p style="${styleStr}">${text}</p>`
      ).run()
    } else {
      editor.chain().focus().insertContent(
        `<span style="${styleStr}">${text}</span>`
      ).run()
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[560px] flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-base font-semibold">段落边框和底纹</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: settings */}
          <div className="w-72 border-r overflow-y-auto p-4 space-y-4">
            {/* Presets */}
            <div>
              <div className="text-xs text-gray-500 mb-2">快速预设</div>
              <div className="grid grid-cols-3 gap-1.5">
                {PRESET_COMBOS.map(p => (
                  <button key={p.label}
                    className="py-2 text-xs rounded border-2 border-gray-200 hover:border-blue-400 flex flex-col items-center gap-0.5 transition-all"
                    onClick={() => applyPreset(p.cfg)}>
                    <span className="text-base">{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Side borders */}
            <div>
              <div className="text-xs text-gray-500 mb-2">独立边框设置</div>
              <div className="border rounded-lg p-2 bg-gray-50">
                <div className="text-xs text-gray-400 grid grid-cols-4 gap-1 mb-1.5 pl-8">
                  <span>样式</span><span className="ml-1">宽度</span><span>颜色</span>
                </div>
                <SideEditor label="上" side={cfg.top} onChange={s => setCfg(c => ({ ...c, top: s }))} />
                <SideEditor label="下" side={cfg.bottom} onChange={s => setCfg(c => ({ ...c, bottom: s }))} />
                <SideEditor label="左" side={cfg.left} onChange={s => setCfg(c => ({ ...c, left: s }))} />
                <SideEditor label="右" side={cfg.right} onChange={s => setCfg(c => ({ ...c, right: s }))} />
              </div>
            </div>

            {/* Background + padding */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">背景颜色</label>
                <div className="flex items-center gap-2">
                  <input type="color"
                    value={cfg.bgColor === 'transparent' ? '#ffffff' : cfg.bgColor}
                    onChange={e => setCfg(c => ({ ...c, bgColor: e.target.value }))}
                    className="w-8 h-7 rounded border cursor-pointer" />
                  <button className="text-xs text-gray-400 hover:text-gray-600"
                    onClick={() => setCfg(c => ({ ...c, bgColor: 'transparent' }))}>透明</button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">内边距 ({cfg.padding}px)</label>
                <input type="range" min="0" max="24" value={cfg.padding}
                  onChange={e => setCfg(c => ({ ...c, padding: parseInt(e.target.value) }))}
                  className="w-full" />
              </div>
            </div>

            {/* Apply to */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">应用到</label>
              <select value={cfg.applyTo}
                onChange={e => setCfg(c => ({ ...c, applyTo: e.target.value as BorderConfig['applyTo'] }))}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                <option value="paragraph">段落</option>
                <option value="text">选中文字</option>
              </select>
            </div>
          </div>

          {/* Right: preview */}
          <div className="flex-1 p-4">
            <div className="text-xs text-gray-500 mb-3">预览</div>
            <div className="bg-gray-50 rounded-lg p-6 min-h-[160px] flex items-center justify-center">
              <div style={{ width: '100%' }}>
                <div style={previewStyle}>
                  这是一段示例文字，用于预览段落边框和底纹效果。The quick brown fox jumps.
                </div>
              </div>
            </div>

            {/* Border summary */}
            <div className="mt-3 text-xs text-gray-400 space-y-0.5">
              {(['top', 'bottom', 'left', 'right'] as const).filter(s => cfg[s].style !== 'none').map(s => (
                <div key={s}>
                  {s === 'top' ? '上' : s === 'bottom' ? '下' : s === 'left' ? '左' : '右'}：
                  {STYLE_OPTIONS.find(o => o.value === cfg[s].style)?.label} {cfg[s].width}px
                </div>
              ))}
              {cfg.bgColor !== 'transparent' && <div>背景色：{cfg.bgColor}</div>}
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t bg-gray-50">
          <button className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
            onClick={() => setCfg({ ...DEFAULT_CONFIG })}>重置</button>
          <button className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
            onClick={onClose}>取消</button>
          <button className="px-6 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={apply}>应用</button>
        </div>
      </div>
    </div>
  )
}

export default ParagraphBorderDialog
