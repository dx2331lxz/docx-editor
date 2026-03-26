import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { tableToText, textToTable } from '../../utils/tableTextConvert'

interface Props {
  editor: Editor | null
  mode: 'tableToText' | 'textToTable'
  onClose: () => void
}

const TableConvertDialog: React.FC<Props> = ({ editor, mode, onClose }) => {
  const [separator, setSeparator] = useState<'tab' | 'comma' | 'newline'>('tab')

  const getSep = () => separator === 'tab' ? '\t' : separator === 'comma' ? ',' : '\n'

  const handleConvert = () => {
    if (!editor) return
    if (mode === 'tableToText') {
      tableToText(editor, getSep())
    } else {
      textToTable(editor, getSep())
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-80 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{mode === 'tableToText' ? '表格转换为文本' : '文本转换为表格'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
        </div>

        <div className="text-sm space-y-2">
          <p className="text-gray-600 font-medium">{mode === 'tableToText' ? '单元格分隔符' : '文字分隔符（列）'}</p>
          {([['tab', '制表符 (Tab)'], ['comma', '逗号 (,)'], ['newline', '段落符']] as const).map(([val, label]) => (
            <label key={val} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={separator === val} onChange={() => setSeparator(val)} />
              {label}
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50">取消</button>
          <button onClick={handleConvert} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">转换</button>
        </div>
      </div>
    </div>
  )
}

export default TableConvertDialog
