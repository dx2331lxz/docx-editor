/**
 * DropCapDialog — 首字下沉对话框
 * 支持：无 / 下沉（Drop）/ 悬挂（Hanging）
 * 可设置：下沉行数、字体、距正文距离
 */
import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'

interface DropCapDialogProps {
  editor: Editor | null
  onClose: () => void
}

type DropCapType = 'none' | 'drop' | 'hanging'

interface DropCapConfig {
  type: DropCapType
  lines: number
  font: string
  distance: number  // em units
}

const FONTS = ['默认', 'Georgia', 'Times New Roman', '楷体', '宋体', '黑体', 'Arial']

const DropCapDialog: React.FC<DropCapDialogProps> = ({ editor, onClose }) => {
  const [config, setConfig] = useState<DropCapConfig>({
    type: 'drop',
    lines: 3,
    font: '默认',
    distance: 0.1,
  })

  const applyDropCap = () => {
    if (!editor) return

    // Remove existing drop cap in current paragraph
    const { from } = editor.state.selection
    const $pos = editor.state.doc.resolve(from)
    const para = $pos.node($pos.depth)
    if (!para || para.type.name !== 'paragraph') {
      onClose()
      return
    }

    const text = para.textContent
    if (!text) { onClose(); return }

    const firstChar = text[0]
    const rest = text.slice(1)

    if (config.type === 'none') {
      // Remove drop cap - just leave text as is
      onClose()
      return
    }

    const fontStyle = config.font !== '默认' ? `font-family:${config.font};` : ''
    const marginRight = config.distance > 0 ? `margin-right:${config.distance}em;` : ''

    let dropStyle = ''
    if (config.type === 'drop') {
      // Drop cap: float left, large font size based on lines
      const fontSize = config.lines * 1.2  // em
      dropStyle = `float:left;font-size:${fontSize}em;line-height:${(config.lines * 1.1 / (config.lines * 1.2)).toFixed(3)};${fontStyle}${marginRight}padding-top:0.05em;font-weight:bold;color:inherit;`
    } else {
      // Hanging: margin-left negative to hang outside margin
      const fontSize = config.lines * 1.2
      dropStyle = `float:left;font-size:${fontSize}em;line-height:${(config.lines * 1.1 / (config.lines * 1.2)).toFixed(3)};${fontStyle}${marginRight}margin-left:-0.5em;font-weight:bold;color:inherit;`
    }

    const html = `<p><span class="drop-cap" data-drop-lines="${config.lines}" data-drop-type="${config.type}" contenteditable="false" style="${dropStyle}">${firstChar}</span>${rest}</p>`

    editor.chain().focus().selectParentNode().insertContent(html).run()
    onClose()
  }

  const previewStyle: React.CSSProperties = config.type !== 'none' ? {
    float: 'left',
    fontSize: `${config.lines * 1.2}em`,
    lineHeight: `${(config.lines * 1.1 / (config.lines * 1.2)).toFixed(3)}`,
    fontFamily: config.font !== '默认' ? config.font : undefined,
    marginRight: `${config.distance}em`,
    fontWeight: 'bold',
    paddingTop: '0.05em',
  } : {}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-80 p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-4 text-gray-800">首字下沉</h3>

        {/* Type selection */}
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-2">位置</label>
          <div className="flex gap-3">
            {([
              { val: 'none', label: '无', icon: '⬜' },
              { val: 'drop', label: '下沉', icon: '𝐃\n⬛' },
              { val: 'hanging', label: '悬挂', icon: '↙𝐃' },
            ] as const).map(({ val, label, icon }) => (
              <button
                key={val}
                onClick={() => setConfig(c => ({ ...c, type: val }))}
                className={`flex-1 flex flex-col items-center py-3 rounded-lg border-2 transition-colors ${config.type === val ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <span className="text-lg mb-1">{icon}</span>
                <span className={`text-xs ${config.type === val ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {config.type !== 'none' && (
          <>
            {/* Lines */}
            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">下沉行数</label>
              <div className="flex items-center gap-2">
                <input
                  type="range" min={2} max={5}
                  value={config.lines}
                  onChange={e => setConfig(c => ({ ...c, lines: parseInt(e.target.value) }))}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-gray-700 w-4">{config.lines}</span>
              </div>
            </div>

            {/* Font */}
            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">字体</label>
              <select
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                value={config.font}
                onChange={e => setConfig(c => ({ ...c, font: e.target.value }))}
              >
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            {/* Distance */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">距正文距离</label>
              <div className="flex items-center gap-2">
                <input
                  type="range" min={0} max={0.5} step={0.05}
                  value={config.distance}
                  onChange={e => setConfig(c => ({ ...c, distance: parseFloat(e.target.value) }))}
                  className="flex-1"
                />
                <span className="text-xs text-gray-500 w-12">{config.distance.toFixed(2)}em</span>
              </div>
            </div>

            {/* Preview */}
            <div className="mb-4 p-3 bg-gray-50 rounded border overflow-hidden min-h-16" style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <span style={previewStyle}>T</span>
              <span className="text-gray-600">his is a preview of drop cap text. The first letter will be enlarged.</span>
              <div style={{ clear: 'both' }} />
            </div>
          </>
        )}

        <div className="flex gap-2 justify-end">
          <button className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded" onClick={onClose}>取消</button>
          <button className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" onClick={applyDropCap}>确定</button>
        </div>
      </div>
    </div>
  )
}

export default DropCapDialog
