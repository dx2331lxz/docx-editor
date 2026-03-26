/**
 * CommentPanel — right-side panel showing all comments in document order.
 * Each comment card shows: highlighted text excerpt, comment text, delete button.
 */

import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { X, MessageSquare, Plus } from 'lucide-react'
import type { Comment } from '../../extensions/CommentMark'

interface CommentPanelProps {
  editor: Editor | null
  comments: Comment[]
  onAddComment: (text: string) => void
  onDeleteComment: (id: string) => void
}

const CommentPanel: React.FC<CommentPanelProps> = ({
  editor,
  comments,
  onAddComment,
  onDeleteComment,
}) => {
  const [draftText, setDraftText] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = () => {
    if (!draftText.trim()) return
    onAddComment(draftText.trim())
    setDraftText('')
    setAdding(false)
  }

  // Check if there's a selected range to annotate
  const hasSelection = editor
    ? !editor.state.selection.empty
    : false

  return (
    <div className="flex flex-col h-full w-64 bg-gray-50 border-l border-gray-200 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white">
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <MessageSquare size={14} className="text-blue-500" /> 批注
          {comments.length > 0 && (
            <span className="ml-1 bg-blue-100 text-blue-700 text-xs px-1.5 rounded-full">
              {comments.length}
            </span>
          )}
        </span>
        {hasSelection && (
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            onClick={() => setAdding(true)}
          >
            <Plus size={12} /> 添加
          </button>
        )}
      </div>

      {/* Add comment form */}
      {adding && (
        <div className="p-2 border-b border-blue-100 bg-blue-50">
          <textarea
            autoFocus
            className="w-full text-xs border border-blue-300 rounded p-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={3}
            placeholder="输入批注内容..."
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) handleAdd()
              if (e.key === 'Escape') setAdding(false)
            }}
          />
          <div className="flex justify-end gap-1 mt-1">
            <button
              type="button"
              className="text-xs px-2 py-0.5 rounded border border-gray-300 hover:bg-gray-100"
              onClick={() => setAdding(false)}
            >
              取消
            </button>
            <button
              type="button"
              className="text-xs px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700"
              onClick={handleAdd}
            >
              确定
            </button>
          </div>
        </div>
      )}

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {comments.length === 0 ? (
          <div className="text-xs text-gray-400 text-center mt-8">
            <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
            暂无批注
            <br />
            <span className="text-gray-300">选中文字后点击"添加"</span>
          </div>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-amber-200 rounded shadow-sm p-2 group"
            >
              <div className="flex items-start justify-between gap-1">
                <p className="text-xs text-gray-700 flex-1 leading-relaxed">{c.text}</p>
                <button
                  type="button"
                  className="flex-shrink-0 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="删除批注"
                  onClick={() => onDeleteComment(c.id)}
                >
                  <X size={12} />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">{c.createdAt}</p>
            </div>
          ))
        )}
      </div>

      {!adding && hasSelection && comments.length === 0 && (
        <div className="p-2 border-t border-gray-200">
          <button
            type="button"
            className="w-full text-xs text-blue-600 hover:underline flex items-center justify-center gap-1 py-1"
            onClick={() => setAdding(true)}
          >
            <Plus size={12} /> 为选中文字添加批注
          </button>
        </div>
      )}
    </div>
  )
}

export default CommentPanel
