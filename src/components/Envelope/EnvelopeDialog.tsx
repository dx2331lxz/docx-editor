import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'

const ENVELOPE_SIZES = [
  { id: 'DL', label: 'DL (110×220mm)', width: '110mm', height: '220mm' },
  { id: 'C5', label: 'C5 (162×229mm)', width: '162mm', height: '229mm' },
  { id: 'B5', label: 'B5 (176×250mm)', width: '176mm', height: '250mm' },
  { id: 'C4', label: 'C4 (229×324mm)', width: '229mm', height: '324mm' },
]

interface Props {
  editor: Editor | null
  onClose: () => void
}

const EnvelopeDialog: React.FC<Props> = ({ editor, onClose }) => {
  const [recipient, setRecipient] = useState('')
  const [sender, setSender] = useState('')
  const [size, setSize] = useState('DL')

  const handleInsert = () => {
    if (!editor) return
    const env = ENVELOPE_SIZES.find(s => s.id === size) ?? ENVELOPE_SIZES[0]
    // Insert envelope page as styled div content
    const content = `<div class="envelope-page" style="width:${env.width};height:${env.height};border:1px solid #ccc;padding:12mm;position:relative;margin:auto;background:#fff;">
<div class="envelope-recipient" style="position:absolute;bottom:30mm;left:20mm;font-size:14pt;line-height:1.8;">${recipient.replace(/\n/g, '<br>')}</div>
<div class="envelope-sender" style="position:absolute;top:8mm;left:8mm;font-size:10pt;color:#666;">${sender.replace(/\n/g, '<br>')}</div>
</div>`
    editor.chain().focus().insertContent(content).run()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[480px] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">信封</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          {/* Envelope preview */}
          <div className="col-span-2 flex justify-center">
            <div className="border-2 border-gray-300 rounded bg-gray-50 w-48 h-28 relative overflow-hidden text-xs">
              <div className="absolute top-1 left-1 text-gray-400 text-[9px] leading-tight whitespace-pre-wrap">
                {sender || '寄件人地址'}
              </div>
              <div className="absolute bottom-2 left-4 text-gray-700 text-[10px] leading-tight whitespace-pre-wrap">
                {recipient || '收件人地址'}
              </div>
              <div className="absolute top-1 right-1 w-6 h-5 border border-gray-300 bg-white text-center text-[8px] text-gray-300">邮票</div>
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1 text-gray-700">收件人地址</label>
            <textarea
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm resize-none"
              rows={4}
              placeholder={"姓名\n地址\n城市 邮编"}
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-medium mb-1 text-gray-700">寄件人地址</label>
            <textarea
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm resize-none"
              rows={4}
              placeholder={"姓名\n地址\n城市 邮编"}
              value={sender}
              onChange={e => setSender(e.target.value)}
            />
          </div>

          <div className="col-span-2">
            <label className="block font-medium mb-1 text-gray-700">信封尺寸</label>
            <select
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={size}
              onChange={e => setSize(e.target.value)}
            >
              {ENVELOPE_SIZES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50">取消</button>
          <button onClick={handleInsert} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">插入到文档</button>
        </div>
      </div>
    </div>
  )
}

export default EnvelopeDialog
