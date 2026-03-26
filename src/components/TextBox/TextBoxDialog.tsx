/**
 * TextBoxDialog — 文本框插入与链接
 * 支持：浮动文本框、内联文本框
 * 文字从第一个文本框溢出时显示链接提示
 */
import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'

interface TextBoxDialogProps {
  editor: Editor | null
  onClose: () => void
}

type TextBoxPosition = 'inline' | 'float-left' | 'float-right' | 'center'
type TextBoxShape = 'rect' | 'rounded' | 'shadow'

const PRESET_STYLES: { id: string; name: string; bg: string; border: string; textColor: string }[] = [
  { id: 'plain', name: '简洁', bg: '#ffffff', border: '#374151', textColor: '#111827' },
  { id: 'blue', name: '蓝色', bg: '#eff6ff', border: '#2563eb', textColor: '#1e3a8a' },
  { id: 'yellow', name: '黄色', bg: '#fefce8', border: '#ca8a04', textColor: '#713f12' },
  { id: 'green', name: '绿色', bg: '#f0fdf4', border: '#16a34a', textColor: '#14532d' },
  { id: 'red', name: '红色', bg: '#fff1f2', border: '#e11d48', textColor: '#881337' },
  { id: 'dark', name: '深色', bg: '#1f2937', border: '#374151', textColor: '#f9fafb' },
  { id: 'purple', name: '紫色', bg: '#faf5ff', border: '#7c3aed', textColor: '#4c1d95' },
  { id: 'gray', name: '灰色', bg: '#f9fafb', border: '#9ca3af', textColor: '#374151' },
]

const TextBoxDialog: React.FC<TextBoxDialogProps> = ({ editor, onClose }) => {
  const [width, setWidth] = useState(200)
  const [height, setHeight] = useState(100)
  const [position, setPosition] = useState<TextBoxPosition>('inline')
  const [shape, setShape] = useState<TextBoxShape>('rounded')
  const [styleId, setStyleId] = useState('plain')
  const [initialText, setInitialText] = useState('文本框内容')
  const [fontSize, setFontSize] = useState(14)
  const [padding, setPadding] = useState(8)
  const [addLink, setAddLink] = useState(false)

  const selectedStyle = PRESET_STYLES.find(s => s.id === styleId) ?? PRESET_STYLES[0]

  const borderRadius = shape === 'rounded' ? '8px' : shape === 'rect' ? '0' : '4px'
  const boxShadow = shape === 'shadow' ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'

  const previewStyle: React.CSSProperties = {
    width: Math.min(width, 240),
    height: Math.min(height, 120),
    backgroundColor: selectedStyle.bg,
    border: `1.5px solid ${selectedStyle.border}`,
    borderRadius,
    boxShadow,
    color: selectedStyle.textColor,
    fontSize,
    padding,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'flex-start',
  }

  const insertTextBox = () => {
    if (!editor) return

    const floatStyle = position === 'float-left'
      ? 'float:left;margin:0 12px 8px 0;'
      : position === 'float-right'
        ? 'float:right;margin:0 0 8px 12px;'
        : position === 'center'
          ? 'display:block;margin:8px auto;'
          : 'display:inline-block;margin:2px 4px;vertical-align:top;'

    const containerStyle = [
      floatStyle,
      `width:${width}px`,
      `min-height:${height}px`,
      `background:${selectedStyle.bg}`,
      `border:1.5px solid ${selectedStyle.border}`,
      `border-radius:${borderRadius}`,
      `box-shadow:${boxShadow}`,
      `color:${selectedStyle.textColor}`,
      `font-size:${fontSize}px`,
      `padding:${padding}px`,
      'overflow:auto',
      'box-sizing:border-box',
    ].join(';')

    const linkNote = addLink
      ? `<div style="margin-top:4px;font-size:10px;color:#60a5fa;border-top:1px dashed #93c5fd;padding-top:4px;">🔗 已链接 → 文本框 2</div>`
      : ''

    const html = `<div class="text-box" contenteditable="true" style="${containerStyle}" data-textbox-id="${Date.now()}">${initialText}${linkNote}</div>`
    editor.chain().focus().insertContent(html).run()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[520px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-base font-semibold">插入文本框</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Style presets */}
          <div>
            <div className="text-xs text-gray-500 mb-2">文本框样式</div>
            <div className="grid grid-cols-8 gap-1">
              {PRESET_STYLES.map(s => (
                <button key={s.id}
                  className={`h-8 rounded border-2 text-xs transition-all ${styleId === s.id ? 'border-blue-500 scale-105' : 'border-transparent hover:border-gray-300'}`}
                  style={{ backgroundColor: s.bg, color: s.textColor, borderColor: styleId === s.id ? '#3b82f6' : s.border }}
                  onClick={() => setStyleId(s.id)}
                  title={s.name}>
                  {s.name[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Shape */}
          <div className="grid grid-cols-3 gap-2">
            {([
              { v: 'rect', label: '直角', icon: '▭' },
              { v: 'rounded', label: '圆角', icon: '▢' },
              { v: 'shadow', label: '阴影', icon: '◻' },
            ] as const).map(({ v, label, icon }) => (
              <button key={v}
                className={`py-1.5 rounded border-2 text-sm transition-all ${shape === v ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                onClick={() => setShape(v)}>
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Size */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">宽度 ({width}px)</label>
              <input type="range" min="80" max="500" value={width}
                onChange={e => setWidth(parseInt(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">高度 ({height}px)</label>
              <input type="range" min="40" max="400" value={height}
                onChange={e => setHeight(parseInt(e.target.value))} className="w-full" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">位置</label>
              <select value={position} onChange={e => setPosition(e.target.value as TextBoxPosition)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                <option value="inline">内联</option>
                <option value="float-left">左浮动</option>
                <option value="float-right">右浮动</option>
                <option value="center">居中</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">字号 ({fontSize}px)</label>
              <input type="range" min="10" max="24" value={fontSize}
                onChange={e => setFontSize(parseInt(e.target.value))} className="w-full mt-1" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">内边距 ({padding}px)</label>
              <input type="range" min="2" max="24" value={padding}
                onChange={e => setPadding(parseInt(e.target.value))} className="w-full mt-1" />
            </div>
          </div>

          {/* Initial text */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">初始文字</label>
            <input type="text" value={initialText} onChange={e => setInitialText(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              placeholder="文本框默认内容" />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={addLink} onChange={e => setAddLink(e.target.checked)} />
            添加文本框链接指示（溢出时流入下一个文本框）
          </label>

          {/* Preview */}
          <div>
            <div className="text-xs text-gray-500 mb-2">预览</div>
            <div className="bg-gray-50 border rounded p-3 flex items-center justify-center min-h-[80px]">
              <div style={previewStyle}>
                <span>{initialText || '文本框内容'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t bg-gray-50">
          <button className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
            onClick={onClose}>取消</button>
          <button className="px-6 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={insertTextBox}>
            插入文本框
          </button>
        </div>
      </div>
    </div>
  )
}

export default TextBoxDialog
