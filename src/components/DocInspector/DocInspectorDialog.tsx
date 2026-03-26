/**
 * DocInspectorDialog — 文档检查器
 * 扫描：批注、修订、隐藏文字、文档属性、页眉页脚信息
 * 支持一键清除选中项
 */
import React, { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/react'

interface DocInspectorProps {
  editor: Editor | null
  onClose: () => void
}

interface InspectResult {
  id: string
  label: string
  icon: string
  count: number
  details: string[]
  checked: boolean
  canRemove: boolean
}

function runInspection(editor: Editor | null): InspectResult[] {
  const results: InspectResult[] = []

  // Comments
  let commentCount = 0
  const commentIds = new Set<string>()
  editor?.state.doc.descendants(node => {
    node.marks.forEach(m => {
      if (m.type.name === 'commentMark' && m.attrs.commentId) {
        commentIds.add(m.attrs.commentId as string)
        commentCount++
      }
    })
  })
  results.push({
    id: 'comments', label: '批注', icon: '💬',
    count: commentIds.size,
    details: commentIds.size > 0 ? [`文档中包含 ${commentIds.size} 条批注`] : ['无批注'],
    checked: commentIds.size > 0, canRemove: true,
  })

  // Revisions / track changes marks
  let revCount = 0
  editor?.state.doc.descendants(node => {
    node.marks.forEach(m => {
      if (m.type.name === 'insertion' || m.type.name === 'deletion') revCount++
    })
  })
  results.push({
    id: 'revisions', label: '修订标记', icon: '✏️',
    count: revCount,
    details: revCount > 0 ? [`文档中包含 ${revCount} 处修订标记`] : ['无修订标记'],
    checked: revCount > 0, canRemove: true,
  })

  // Hidden text (spans with display:none or visibility:hidden)
  const html = editor?.getHTML() ?? ''
  const hiddenMatches = html.match(/display\s*:\s*none|visibility\s*:\s*hidden/gi) ?? []
  results.push({
    id: 'hidden', label: '隐藏文字', icon: '👁️',
    count: hiddenMatches.length,
    details: hiddenMatches.length > 0 ? [`发现 ${hiddenMatches.length} 处隐藏内容`] : ['无隐藏文字'],
    checked: hiddenMatches.length > 0, canRemove: true,
  })

  // Header/footer
  const headerEl = document.querySelector('.header-footer-zone') as HTMLElement | null
  const hasHeaderFooter = !!headerEl
  results.push({
    id: 'headerfooter', label: '页眉和页脚', icon: '📑',
    count: hasHeaderFooter ? 1 : 0,
    details: hasHeaderFooter ? ['文档包含页眉/页脚内容'] : ['无页眉/页脚'],
    checked: false, canRemove: false,
  })

  // Merge fields
  const mergeFields = html.match(/class="merge-field"/gi) ?? []
  results.push({
    id: 'mergefields', label: '邮件合并域', icon: '📧',
    count: mergeFields.length,
    details: mergeFields.length > 0 ? [`包含 ${mergeFields.length} 个合并域`] : ['无合并域'],
    checked: mergeFields.length > 0, canRemove: true,
  })

  // Doc properties (custom metadata)
  const docPropsStr = localStorage.getItem('docx-editor-props')
  const hasProps = !!docPropsStr && docPropsStr !== '{}'
  results.push({
    id: 'docprops', label: '文档属性', icon: '📋',
    count: hasProps ? 1 : 0,
    details: hasProps ? ['文档包含自定义属性信息（标题、作者、关键词等）'] : ['无自定义属性'],
    checked: false, canRemove: true,
  })

  // Embedded images (base64)
  const b64Matches = html.match(/data:image\/[^;]+;base64,/gi) ?? []
  results.push({
    id: 'images', label: '嵌入图片', icon: '🖼️',
    count: b64Matches.length,
    details: b64Matches.length > 0 ? [`包含 ${b64Matches.length} 张嵌入图片（base64格式）`] : ['无嵌入图片'],
    checked: false, canRemove: false,
  })

  return results
}

const DocInspectorDialog: React.FC<DocInspectorProps> = ({ editor, onClose }) => {
  const [results, setResults] = useState<InspectResult[]>([])
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState<Date | null>(null)

  const runScan = () => {
    setScanning(true)
    setTimeout(() => {
      setResults(runInspection(editor))
      setLastScan(new Date())
      setScanning(false)
    }, 400)
  }

  useEffect(() => { runScan() }, [])

  const toggle = (id: string) => {
    setResults(r => r.map(x => x.id === id ? { ...x, checked: !x.checked } : x))
  }

  const handleRemove = () => {
    if (!editor) return
    const toRemove = results.filter(r => r.checked && r.canRemove).map(r => r.id)
    if (!toRemove.length) return

    const { tr } = editor.state
    let modified = false

    editor.state.doc.descendants((node, pos) => {
      const newMarks = node.marks.filter(m => {
        if (toRemove.includes('comments') && m.type.name === 'commentMark') return false
        if (toRemove.includes('revisions') && (m.type.name === 'insertion' || m.type.name === 'deletion')) return false
        return true
      })
      if (newMarks.length !== node.marks.length) {
        tr.removeMark(pos, pos + node.nodeSize)
        newMarks.forEach(m => tr.addMark(pos, pos + node.nodeSize, m))
        modified = true
      }
    })

    if (toRemove.includes('mergefields')) {
      // Replace merge field spans with their text content
      const html = editor.getHTML().replace(
        /<span[^>]*class="merge-field"[^>]*>«([^»]+)»<\/span>/g,
        '$1'
      )
      editor.commands.setContent(html)
      modified = true
    }

    if (toRemove.includes('docprops')) {
      localStorage.removeItem('docx-editor-props')
    }

    if (modified) editor.view.dispatch(tr)
    runScan()
  }

  const selectedCount = results.filter(r => r.checked && r.canRemove).length
  const totalIssues = results.filter(r => r.count > 0).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[500px] flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <h3 className="text-base font-semibold text-gray-800">文档检查器</h3>
            {lastScan && (
              <p className="text-xs text-gray-400">扫描时间：{lastScan.toLocaleTimeString()}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* Summary */}
        <div className={`px-5 py-3 text-sm ${totalIssues > 0 ? 'bg-amber-50 border-b border-amber-100' : 'bg-green-50 border-b border-green-100'}`}>
          {scanning ? (
            <span className="text-gray-500 animate-pulse">正在扫描文档...</span>
          ) : totalIssues > 0 ? (
            <span className="text-amber-700">⚠ 发现 {totalIssues} 类需要注意的内容。导出前建议清理个人信息。</span>
          ) : (
            <span className="text-green-700">✓ 未发现隐私或修订相关内容，可安全分享。</span>
          )}
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto divide-y">
          {results.map(r => (
            <div key={r.id} className={`px-5 py-3 ${r.count > 0 ? 'bg-white' : 'bg-gray-50'}`}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 cursor-pointer"
                  checked={r.checked}
                  disabled={!r.canRemove}
                  onChange={() => toggle(r.id)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span>{r.icon}</span>
                    <span className="text-sm font-medium text-gray-800">{r.label}</span>
                    {r.count > 0 ? (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{r.count}</span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">✓</span>
                    )}
                    {!r.canRemove && <span className="text-xs text-gray-400">(仅查看)</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{r.details[0]}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t bg-gray-50">
          <button
            className="text-sm text-blue-600 hover:underline"
            onClick={runScan}
          >
            🔄 重新扫描
          </button>
          <div className="flex gap-2">
            <button className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded border border-gray-300" onClick={onClose}>
              关闭
            </button>
            <button
              className="px-4 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={handleRemove}
              disabled={selectedCount === 0}
            >
              清除所选 ({selectedCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocInspectorDialog
