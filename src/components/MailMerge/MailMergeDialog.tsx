/**
 * MailMergeDialog — 邮件合并（简化版）
 * 支持：粘贴CSV数据、{{字段名}}语法插入合并域、预览与数据切换
 */
import React, { useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'

interface MailMergeDialogProps {
  editor: Editor | null
  onClose: () => void
}

function parseCSV(csv: string): { headers: string[]; rows: string[][] } {
  const lines = csv.trim().split('\n').filter(l => l.trim())
  if (!lines.length) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = lines.slice(1).map(l => l.split(',').map(v => v.trim().replace(/^"|"$/g, '')))
  return { headers, rows }
}

function applyMerge(template: string, record: Record<string, string>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => record[key.trim()] ?? `{{${key}}}`)
}

const MailMergeDialog: React.FC<MailMergeDialogProps> = ({ editor, onClose }) => {
  const [tab, setTab] = useState<'data' | 'fields' | 'preview'>('data')
  const [csvText, setCsvText] = useState('')
  const [parsed, setParsed] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [currentRow, setCurrentRow] = useState(0)
  const [parseError, setParseError] = useState('')

  const handleParseCSV = () => {
    try {
      if (!csvText.trim()) {
        setParseError('请先粘贴CSV数据')
        return
      }
      const result = parseCSV(csvText)
      if (!result.headers.length) {
        setParseError('无法解析CSV，请检查格式')
        return
      }
      setParsed(result)
      setParseError('')
      setTab('fields')
    } catch {
      setParseError('CSV格式错误')
    }
  }

  const handleInsertField = useCallback((field: string) => {
    if (!editor) return
    const fieldHtml = `<span class="merge-field" data-field="${field}" contenteditable="false" style="background:#fef3c7;border:1px solid #f59e0b;border-radius:3px;padding:0 4px;font-size:0.9em;color:#92400e;cursor:default;" title="合并域: ${field}">«${field}»</span>`
    editor.chain().focus().insertContent(fieldHtml).run()
  }, [editor])

  const getPreviewHtml = () => {
    if (!editor || !parsed || !parsed.rows.length) return ''
    const record: Record<string, string> = {}
    parsed.headers.forEach((h, i) => {
      record[h] = parsed.rows[currentRow]?.[i] ?? ''
    })
    const editorHtml = editor.getHTML()
    // Replace merge field spans with actual values
    return editorHtml.replace(
      /<span[^>]*data-field="([^"]+)"[^>]*>«[^»]+»<\/span>/g,
      (_, field) => record[field] ?? `{{${field}}}`
    )
  }

  const handleApplyMerge = () => {
    if (!editor || !parsed || !parsed.rows.length) return
    const record: Record<string, string> = {}
    parsed.headers.forEach((h, i) => {
      record[h] = parsed.rows[currentRow]?.[i] ?? ''
    })
    const html = applyMerge(editor.getHTML(), record)
    editor.commands.setContent(html)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[560px] flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-base font-semibold text-gray-800">邮件合并</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {(['data', 'fields', 'preview'] as const).map(t => (
            <button
              key={t}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-500 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setTab(t)}
            >
              {t === 'data' ? '① 数据源' : t === 'fields' ? '② 插入域' : '③ 预览'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Tab: Data */}
          {tab === 'data' && (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                粘贴CSV格式的数据（第一行为字段名）：
              </p>
              <div className="mb-2 text-xs text-gray-400 font-mono bg-gray-50 p-2 rounded border">
                姓名,部门,日期<br />
                张三,技术部,2024-01-01<br />
                李四,市场部,2024-01-02
              </div>
              <textarea
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono resize-none"
                rows={8}
                placeholder="在此粘贴CSV数据..."
                value={csvText}
                onChange={e => { setCsvText(e.target.value); setParseError('') }}
              />
              {parseError && <p className="text-red-500 text-xs mt-1">{parseError}</p>}
              {parsed && (
                <p className="text-green-600 text-xs mt-1">
                  ✓ 已解析 {parsed.headers.length} 个字段，{parsed.rows.length} 条记录
                </p>
              )}
              <button
                className="mt-3 px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={handleParseCSV}
              >
                解析数据
              </button>
            </div>
          )}

          {/* Tab: Fields */}
          {tab === 'fields' && (
            <div>
              {!parsed ? (
                <div className="text-center text-gray-400 py-8 text-sm">
                  请先在"数据源"标签页解析CSV数据
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-3">
                    点击字段按钮，在光标位置插入合并域。合并域显示为 «字段名» 格式。
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {parsed.headers.map(h => (
                      <button
                        key={h}
                        className="px-3 py-1.5 text-sm bg-amber-50 border border-amber-300 text-amber-800 rounded hover:bg-amber-100 transition-colors"
                        onClick={() => handleInsertField(h)}
                      >
                        «{h}»
                      </button>
                    ))}
                  </div>
                  <div className="p-3 bg-blue-50 rounded text-sm text-blue-700">
                    💡 提示：也可以直接在文档中输入 <code className="bg-blue-100 px-1 rounded">{'{{字段名}}'}</code> 格式，预览时会自动替换。
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab: Preview */}
          {tab === 'preview' && (
            <div>
              {!parsed || !parsed.rows.length ? (
                <div className="text-center text-gray-400 py-8 text-sm">
                  请先解析CSV数据
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm text-gray-600">记录：</span>
                    <button
                      className="px-2 py-0.5 text-sm border rounded disabled:opacity-40"
                      disabled={currentRow === 0}
                      onClick={() => setCurrentRow(r => r - 1)}
                    >‹</button>
                    <span className="text-sm font-medium text-gray-700">
                      {currentRow + 1} / {parsed.rows.length}
                    </span>
                    <button
                      className="px-2 py-0.5 text-sm border rounded disabled:opacity-40"
                      disabled={currentRow >= parsed.rows.length - 1}
                      onClick={() => setCurrentRow(r => r + 1)}
                    >›</button>
                  </div>

                  {/* Data table row */}
                  <div className="mb-3 overflow-x-auto">
                    <table className="text-xs border-collapse border border-gray-200 w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          {parsed.headers.map(h => (
                            <th key={h} className="border border-gray-200 px-2 py-1 text-gray-600">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {parsed.rows[currentRow]?.map((v, i) => (
                            <td key={i} className="border border-gray-200 px-2 py-1">{v}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="border border-gray-200 rounded p-3 bg-gray-50 max-h-48 overflow-y-auto text-sm">
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t bg-gray-50">
          <button className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded" onClick={onClose}>关闭</button>
          {tab === 'preview' && parsed && parsed.rows.length > 0 && (
            <button
              className="px-4 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600"
              onClick={handleApplyMerge}
            >
              应用当前记录
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default MailMergeDialog
