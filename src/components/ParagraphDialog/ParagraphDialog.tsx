import React, { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { X } from 'lucide-react'

interface ParagraphDialogProps {
  editor: Editor
  onClose: () => void
}

const ParagraphDialog: React.FC<ParagraphDialogProps> = ({ editor, onClose }) => {
  const paraAttrs = editor.getAttributes('paragraph')
  const [align, setAlign] = useState<string>((editor.getAttributes('paragraph').textAlign as string) ?? 'left')
  const [spaceBefore, setSpaceBefore] = useState<number>((paraAttrs.marginTop as number) ?? 0)
  const [spaceAfter, setSpaceAfter] = useState<number>((paraAttrs.marginBottom as number) ?? 0)
  const [lineSpacing, setLineSpacing] = useState<string>('1.0')
  const [paddingLeft, setPaddingLeft] = useState<number>((paraAttrs.paddingLeft as number) ?? 0)
  const [paddingRight, setPaddingRight] = useState<number>((paraAttrs.paddingRight as number) ?? 0)
  const [firstLineIndent, setFirstLineIndent] = useState<number>((paraAttrs.firstLineIndent as number) ?? 0)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleConfirm = () => {
    editor.chain().focus()
      .setTextAlign(align)
      .setParagraphSpacing({ before: spaceBefore, after: spaceAfter, paddingLeft, paddingRight })
      .setLineHeight(lineSpacing)
      .setFirstLineIndent(firstLineIndent)
      .run()
    onClose()
  }

  const inputClass = 'border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full'
  const labelClass = 'text-sm text-gray-600 font-medium'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-lg shadow-xl w-96 flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-800">段落设置</h3>
          <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <div>
            <label className={`${labelClass} block mb-1`}>对齐方式</label>
            <select value={align} onChange={e => setAlign(e.target.value)} className={inputClass}>
              <option value="left">左对齐</option>
              <option value="center">居中</option>
              <option value="right">右对齐</option>
              <option value="justify">两端对齐</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`${labelClass} block mb-1`}>段前间距 (pt)</label>
              <input type="number" value={spaceBefore} onChange={e => setSpaceBefore(Number(e.target.value))} min={0} step={1} className={inputClass} />
            </div>
            <div>
              <label className={`${labelClass} block mb-1`}>段后间距 (pt)</label>
              <input type="number" value={spaceAfter} onChange={e => setSpaceAfter(Number(e.target.value))} min={0} step={1} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={`${labelClass} block mb-1`}>行间距</label>
            <select value={lineSpacing} onChange={e => setLineSpacing(e.target.value)} className={inputClass}>
              <option value="1.0">单倍 (1.0)</option>
              <option value="1.15">1.15 倍</option>
              <option value="1.5">1.5 倍</option>
              <option value="2.0">双倍 (2.0)</option>
              <option value="2.5">2.5 倍</option>
              <option value="3.0">三倍 (3.0)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`${labelClass} block mb-1`}>左缩进 (cm)</label>
              <input type="number" value={paddingLeft} onChange={e => setPaddingLeft(Number(e.target.value))} min={0} step={0.5} className={inputClass} />
            </div>
            <div>
              <label className={`${labelClass} block mb-1`}>右缩进 (cm)</label>
              <input type="number" value={paddingRight} onChange={e => setPaddingRight(Number(e.target.value))} min={0} step={0.5} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={`${labelClass} block mb-1`}>首行缩进 (级)</label>
            <input type="number" value={firstLineIndent} onChange={e => setFirstLineIndent(Number(e.target.value))} min={0} max={10} step={1} className={inputClass} />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200">
          <button className="border border-gray-300 rounded px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors" onClick={onClose}>取消</button>
          <button className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm hover:bg-blue-700 transition-colors" onClick={handleConfirm}>确定</button>
        </div>
      </div>
    </div>
  )
}

export default ParagraphDialog
