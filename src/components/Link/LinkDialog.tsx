/**
 * LinkDialog — modal for inserting / editing hyperlinks.
 * Opens when the user clicks the link toolbar button or Ctrl+K.
 */
import React, { useState, useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import { Link2, Trash2, X } from 'lucide-react'

interface LinkDialogProps {
  editor: Editor
  onClose: () => void
}

const LinkDialog: React.FC<LinkDialogProps> = ({ editor, onClose }) => {
  const existingHref = editor.getAttributes('link').href as string | undefined
  const existingText = editor.state.selection.empty
    ? ''
    : editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        ' ',
      )

  const [text, setText] = useState(existingText || '')
  const [url, setUrl] = useState(existingHref || 'https://')
  const urlRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    urlRef.current?.focus()
    urlRef.current?.select()
  }, [])

  const handleApply = () => {
    if (!url.trim()) return
    const href = url.startsWith('http') ? url : `https://${url}`

    if (!editor.state.selection.empty) {
      editor.chain().focus().setLink({ href }).run()
    } else if (text.trim()) {
      editor.chain().focus().insertContent(`<a href="${href}">${text}</a>`).run()
    } else {
      editor.chain().focus().insertContent(`<a href="${href}">${href}</a>`).run()
    }
    onClose()
  }

  const handleRemove = () => {
    editor.chain().focus().unsetLink().run()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-2xl w-96 border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="font-semibold text-gray-800 flex items-center gap-2">
            <Link2 size={16} className="text-blue-500" />
            {existingHref ? '编辑超链接' : '插入超链接'}
          </span>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {!existingText && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">显示文字</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="链接文字（留空则使用 URL）"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">URL 地址</label>
            <input
              ref={urlRef}
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApply()
                if (e.key === 'Escape') onClose()
              }}
            />
          </div>
          <p className="text-xs text-gray-400">Ctrl+单击链接在新标签页打开</p>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          {existingHref ? (
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
              onClick={handleRemove}
            >
              <Trash2 size={12} /> 删除链接
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-100"
              onClick={onClose}
            >
              取消
            </button>
            <button
              type="button"
              className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
              onClick={handleApply}
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LinkDialog
