import React, { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/react'

interface Bookmark {
  id: string
  name: string
  pos: number
}

interface Props {
  editor: Editor | null
  onClose: () => void
}

const BookmarkDialog: React.FC<Props> = ({ editor, onClose }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [newName, setNewName] = useState('')

  const refresh = () => {
    if (!editor) return
    const bms: Bookmark[] = []
    editor.state.doc.descendants((node, pos) => {
      node.marks.forEach(mark => {
        if (mark.type.name === 'bookmark') {
          bms.push({ id: mark.attrs.id as string, name: mark.attrs.name as string, pos })
        }
      })
    })
    setBookmarks(bms)
  }

  useEffect(() => { refresh() }, [editor])

  const handleAdd = () => {
    if (!newName.trim() || !editor) return
    const id = `bm-${Date.now()}`
    const { from, to } = editor.state.selection
    if (from === to) {
      editor.chain().focus().insertContentAt(from, {
        type: 'text',
        text: '\u200B',
        marks: [{ type: 'bookmark', attrs: { id, name: newName.trim() } }]
      }).run()
    } else {
      editor.chain().focus().setMark('bookmark', { id, name: newName.trim() }).run()
    }
    setNewName('')
    setTimeout(refresh, 100)
  }

  const handleJump = (pos: number) => {
    if (!editor) return
    editor.commands.setTextSelection(pos)
    editor.view.focus()
    onClose()
  }

  const handleDelete = (id: string) => {
    if (!editor) return
    const { state } = editor
    const { tr, doc } = state
    doc.descendants((node, pos) => {
      node.marks.forEach(mark => {
        if (mark.type.name === 'bookmark' && mark.attrs.id === id) {
          tr.removeMark(pos, pos + node.nodeSize, mark.type)
        }
      })
    })
    editor.view.dispatch(tr)
    setTimeout(refresh, 100)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">书签</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
            placeholder="书签名称..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            添加
          </button>
        </div>

        <div className="border rounded max-h-52 overflow-y-auto">
          {bookmarks.length === 0 ? (
            <p className="text-gray-400 text-sm p-4 text-center">暂无书签</p>
          ) : bookmarks.map(bm => (
            <div key={bm.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 border-b last:border-b-0">
              <span className="text-sm font-medium">{bm.name}</span>
              <div className="flex gap-2">
                <button onClick={() => handleJump(bm.pos)} className="text-blue-600 text-xs hover:underline">跳转</button>
                <button onClick={() => handleDelete(bm.id)} className="text-red-500 text-xs hover:underline">删除</button>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onClose} className="mt-4 w-full py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm">关闭</button>
      </div>
    </div>
  )
}

export default BookmarkDialog
