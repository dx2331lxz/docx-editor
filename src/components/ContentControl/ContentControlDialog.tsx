/**
 * ContentControlDialog — 内容控件/表单域插入对话框
 * 支持：富文本控件、下拉选项控件、复选框控件、日期选择器
 */
import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'

interface ContentControlDialogProps {
  editor: Editor | null
  onClose: () => void
}

type ControlType = 'richtext' | 'dropdown' | 'checkbox' | 'datepicker'

const CONTROL_TYPES: { type: ControlType; label: string; icon: string; desc: string }[] = [
  { type: 'richtext', label: '富文本控件', icon: '📝', desc: '可编辑的富文本输入区域' },
  { type: 'dropdown', label: '下拉选项控件', icon: '▼', desc: '从预设选项中选择' },
  { type: 'checkbox', label: '复选框控件', icon: '☑', desc: '可勾选的复选框' },
  { type: 'datepicker', label: '日期选择器', icon: '📅', desc: '日期选择输入控件' },
]

function buildControlHtml(type: ControlType, opts: Record<string, string>): string {
  const base = `data-control-type="${type}"`

  switch (type) {
    case 'richtext':
      return `<span ${base} contenteditable="true" class="content-control richtext-control" style="display:inline-block;min-width:120px;min-height:1.4em;border:1px solid #93c5fd;border-radius:3px;padding:1px 6px;background:#f0f9ff;color:#1e40af;" title="富文本控件">${opts.placeholder || '点击输入文字...'}</span>`

    case 'dropdown': {
      const optionsList = (opts.options || '选项1,选项2,选项3').split(',')
      const optionsHtml = optionsList.map((o, i) => `<option value="${o.trim()}" ${i === 0 ? 'selected' : ''}>${o.trim()}</option>`).join('')
      return `<select ${base} class="content-control dropdown-control" style="border:1px solid #93c5fd;border-radius:3px;padding:1px 4px;background:#f0f9ff;color:#1e40af;font-size:inherit;cursor:pointer;" title="下拉选项控件">${optionsHtml}</select>`
    }

    case 'checkbox':
      return `<span ${base} data-checked="false" class="content-control checkbox-control" onclick="this.dataset.checked=this.dataset.checked==='true'?'false':'true';this.textContent=this.dataset.checked==='true'?'☑':'☐'" contenteditable="false" style="display:inline-block;width:1.2em;height:1.2em;text-align:center;border:1px solid #93c5fd;border-radius:2px;background:#f0f9ff;color:#1e40af;cursor:pointer;font-size:inherit;line-height:1;" title="复选框控件">☐</span>`

    case 'datepicker':
      return `<input type="date" ${base} class="content-control datepicker-control" style="border:1px solid #93c5fd;border-radius:3px;padding:1px 4px;background:#f0f9ff;color:#1e40af;font-size:inherit;cursor:pointer;" title="日期选择器" />`

    default:
      return ''
  }
}

const ContentControlDialog: React.FC<ContentControlDialogProps> = ({ editor, onClose }) => {
  const [selectedType, setSelectedType] = useState<ControlType>('richtext')
  const [placeholder, setPlaceholder] = useState('点击输入文字...')
  const [options, setOptions] = useState('选项1,选项2,选项3')
  const [label, setLabel] = useState('')

  const handleInsert = () => {
    if (!editor) return

    const opts: Record<string, string> = {
      placeholder,
      options,
      label,
    }

    let html = ''
    if (label) {
      html += `<span style="color:#6b7280;font-size:0.9em;">${label}：</span>`
    }
    html += buildControlHtml(selectedType, opts)

    editor.chain().focus().insertContent(html).run()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-96 p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-4 text-gray-800">插入内容控件</h3>

        {/* Control type selection */}
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-2">控件类型</label>
          <div className="grid grid-cols-2 gap-2">
            {CONTROL_TYPES.map(ct => (
              <button
                key={ct.type}
                className={`flex items-start gap-2 p-2.5 rounded-lg border text-left transition-colors ${selectedType === ct.type ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                onClick={() => setSelectedType(ct.type)}
              >
                <span className="text-lg leading-none mt-0.5">{ct.icon}</span>
                <div>
                  <div className={`text-xs font-medium ${selectedType === ct.type ? 'text-blue-700' : 'text-gray-700'}`}>{ct.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{ct.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Options based on type */}
        <div className="mb-3">
          <label className="block text-sm text-gray-600 mb-1">字段标签（可选）</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            placeholder="如：姓名、日期..."
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
        </div>

        {selectedType === 'richtext' && (
          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">占位提示文字</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={placeholder}
              onChange={e => setPlaceholder(e.target.value)}
            />
          </div>
        )}

        {selectedType === 'dropdown' && (
          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">选项列表（用逗号分隔）</label>
            <textarea
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm resize-none"
              rows={3}
              value={options}
              onChange={e => setOptions(e.target.value)}
              placeholder="选项1,选项2,选项3"
            />
          </div>
        )}

        {/* Preview */}
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <div className="text-xs text-gray-500 mb-1">预览</div>
          <div
            className="text-sm"
            dangerouslySetInnerHTML={{
              __html: buildControlHtml(selectedType, { placeholder, options, label })
            }}
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded" onClick={onClose}>取消</button>
          <button className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" onClick={handleInsert}>插入</button>
        </div>
      </div>
    </div>
  )
}

export default ContentControlDialog
