import React, { useState } from 'react'

export interface DocProperties {
  title: string
  subject: string
  author: string
  description: string
  createdAt: string
  modifiedAt: string
}

export const DEFAULT_DOC_PROPS: DocProperties = {
  title: '未命名文档',
  subject: '',
  author: '',
  description: '',
  createdAt: new Date().toISOString(),
  modifiedAt: new Date().toISOString(),
}

interface Props {
  props: DocProperties
  wordCount: number
  paragraphCount: number
  onApply: (p: DocProperties) => void
  onClose: () => void
}

const DocPropsDialog: React.FC<Props> = ({ props, wordCount, paragraphCount, onApply, onClose }) => {
  const [local, setLocal] = useState<DocProperties>(props)
  const set = (k: keyof DocProperties) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setLocal(p => ({ ...p, [k]: e.target.value }))

  const fmt = (iso: string) => {
    try { return new Date(iso).toLocaleString('zh-CN') } catch { return iso }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[480px] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">文档属性</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        <div className="space-y-3 text-sm">
          {/* Editable fields */}
          <div className="grid grid-cols-3 gap-3 items-center">
            <label className="text-gray-600 font-medium">标题</label>
            <input className="col-span-2 border border-gray-300 rounded px-2 py-1.5"
              value={local.title} onChange={set('title')} />
          </div>
          <div className="grid grid-cols-3 gap-3 items-center">
            <label className="text-gray-600 font-medium">主题</label>
            <input className="col-span-2 border border-gray-300 rounded px-2 py-1.5"
              value={local.subject} onChange={set('subject')} placeholder="（可选）" />
          </div>
          <div className="grid grid-cols-3 gap-3 items-center">
            <label className="text-gray-600 font-medium">作者</label>
            <input className="col-span-2 border border-gray-300 rounded px-2 py-1.5"
              value={local.author} onChange={set('author')} placeholder="（可选）" />
          </div>
          <div className="grid grid-cols-3 gap-3 items-start">
            <label className="text-gray-600 font-medium mt-1">描述</label>
            <textarea className="col-span-2 border border-gray-300 rounded px-2 py-1.5 resize-none"
              rows={2} value={local.description} onChange={set('description')} placeholder="（可选）" />
          </div>

          {/* Read-only stats */}
          <div className="border-t pt-3 space-y-2 text-gray-500">
            <div className="grid grid-cols-3 gap-3">
              <span className="font-medium">创建时间</span>
              <span className="col-span-2">{fmt(local.createdAt)}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <span className="font-medium">修改时间</span>
              <span className="col-span-2">{fmt(local.modifiedAt)}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <span className="font-medium">字数</span>
              <span className="col-span-2">{wordCount.toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <span className="font-medium">段落数</span>
              <span className="col-span-2">{paragraphCount}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50">取消</button>
          <button
            onClick={() => { onApply({ ...local, modifiedAt: new Date().toISOString() }); onClose() }}
            className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >保存</button>
        </div>
      </div>
    </div>
  )
}

export default DocPropsDialog
