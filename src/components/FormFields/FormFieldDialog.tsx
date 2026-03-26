import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'

interface FormFieldDialogProps {
  editor: Editor | null
  onClose: () => void
}

type FieldType = 'text' | 'checkbox' | 'select' | 'date'

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: '文本域' },
  { value: 'checkbox', label: '复选框' },
  { value: 'select', label: '下拉选择框' },
  { value: 'date', label: '日期选择器' },
]

function buildHtml(type: FieldType, label: string, defaultVal: string, choices: string[]): string {
  switch (type) {
    case 'text':
      return `<span contenteditable="false" style="display:inline-block">${label ? `<label style="margin-right:4px">${label}</label>` : ''}<input type="text" placeholder="${defaultVal}" style="border:1px solid #999;padding:2px 6px;border-radius:3px;min-width:120px" /></span>`
    case 'checkbox':
      return `<span contenteditable="false" style="display:inline-block"><input type="checkbox" ${defaultVal === 'checked' ? 'checked' : ''} /> <label>${label || '选项'}</label></span>`
    case 'select': {
      const opts = choices.length > 0 ? choices : ['选项1', '选项2', '选项3']
      const optHtml = opts.map(o => `<option value="${o}"${o === defaultVal ? ' selected' : ''}>${o}</option>`).join('')
      return `<span contenteditable="false" style="display:inline-block">${label ? `<label style="margin-right:4px">${label}</label>` : ''}<select style="border:1px solid #999;padding:2px;border-radius:3px">${optHtml}</select></span>`
    }
    case 'date':
      return `<span contenteditable="false" style="display:inline-block">${label ? `<label style="margin-right:4px">${label}</label>` : ''}<input type="date" value="${defaultVal}" style="border:1px solid #999;padding:2px 4px;border-radius:3px" /></span>`
    default:
      return ''
  }
}

const FormFieldDialog: React.FC<FormFieldDialogProps> = ({ editor, onClose }) => {
  const [fieldType, setFieldType] = useState<FieldType>('text')
  const [label, setLabel] = useState('')
  const [defaultVal, setDefaultVal] = useState('')
  const [choicesText, setChoicesText] = useState('选项1\n选项2\n选项3')

  const handleInsert = () => {
    if (!editor) return
    const choices = fieldType === 'select' ? choicesText.split('\n').map(s => s.trim()).filter(Boolean) : []
    const html = buildHtml(fieldType, label, defaultVal, choices)
    editor.chain().focus().insertContent(html).run()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-2xl w-[440px] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-green-600 to-teal-600 rounded-t-lg">
          <h2 className="text-white font-semibold text-base">🗂️ 插入表单域</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-lg font-bold">×</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Field type selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">字段类型</label>
            <div className="grid grid-cols-2 gap-2">
              {FIELD_TYPES.map(ft => (
                <button
                  key={ft.value}
                  onClick={() => setFieldType(ft.value)}
                  className={`py-2 rounded border text-sm font-medium transition-colors
                    ${fieldType === ft.value ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'}`}
                >
                  {ft.label}
                </button>
              ))}
            </div>
          </div>

          {/* Label */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">标签文字</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
              placeholder="留空则不显示标签"
              value={label}
              onChange={e => setLabel(e.target.value)}
            />
          </div>

          {/* Default value */}
          {fieldType !== 'select' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {fieldType === 'checkbox' ? '默认状态（输入 checked 表示勾选）' : fieldType === 'date' ? '默认日期（YYYY-MM-DD）' : '默认值 / 占位符'}
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                placeholder={fieldType === 'checkbox' ? 'checked 或留空' : fieldType === 'date' ? '2024-01-01' : '请输入...'}
                value={defaultVal}
                onChange={e => setDefaultVal(e.target.value)}
              />
            </div>
          )}

          {/* Dropdown choices */}
          {fieldType === 'select' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">选项列表（每行一个）</label>
              <textarea
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-green-400 resize-none"
                rows={4}
                value={choicesText}
                onChange={e => setChoicesText(e.target.value)}
              />
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 mt-2">默认选中项</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                  placeholder="留空则默认选第一项"
                  value={defaultVal}
                  onChange={e => setDefaultVal(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="border rounded p-3 bg-gray-50">
            <p className="text-xs text-gray-500 mb-2 font-semibold">预览</p>
            <div
              className="text-sm"
              dangerouslySetInnerHTML={{
                __html: buildHtml(
                  fieldType,
                  label,
                  defaultVal,
                  fieldType === 'select' ? choicesText.split('\n').map(s => s.trim()).filter(Boolean) : []
                ),
              }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t bg-gray-50 rounded-b-lg">
          <button onClick={onClose} className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100">取消</button>
          <button
            onClick={handleInsert}
            disabled={!editor}
            className="px-4 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-40"
          >
            插入
          </button>
        </div>
      </div>
    </div>
  )
}

export default FormFieldDialog
