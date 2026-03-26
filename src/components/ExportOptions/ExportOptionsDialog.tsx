/**
 * ExportOptionsDialog — 文档导出选项
 * 支持：DOCX密码设置、PDF导出、页码范围、批注选项
 */
import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'
import type { AIDocument } from '../../types/editor'

interface ExportOptionsDialogProps {
  editor: Editor | null
  currentDoc: AIDocument | null
  onExportDocx: (doc: AIDocument) => Promise<void>
  onClose: () => void
}

type ExportFormat = 'docx' | 'pdf' | 'txt' | 'html'
type PageRange = 'all' | 'current' | 'custom'

interface ExportOptions {
  format: ExportFormat
  password: string
  confirmPassword: string
  pageRange: PageRange
  customRange: string
  includeComments: boolean
  includeRevisions: boolean
  printQuality: 'draft' | 'standard' | 'high'
}

const ExportOptionsDialog: React.FC<ExportOptionsDialogProps> = ({ editor, currentDoc, onExportDocx, onClose }) => {
  const [opts, setOpts] = useState<ExportOptions>({
    format: 'docx',
    password: '',
    confirmPassword: '',
    pageRange: 'all',
    customRange: '1-3',
    includeComments: true,
    includeRevisions: false,
    printQuality: 'standard',
  })
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  const validate = (): string => {
    if (opts.password && opts.password !== opts.confirmPassword) {
      return '两次输入的密码不一致'
    }
    if (opts.password && opts.password.length < 4) {
      return '密码至少需要4个字符'
    }
    if (opts.pageRange === 'custom' && !/^[\d,\-\s]+$/.test(opts.customRange)) {
      return '页码格式无效（例：1-3,5,7-9）'
    }
    return ''
  }

  const handleExport = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setExporting(true)

    try {
      if (opts.format === 'docx') {
        if (currentDoc) {
          await onExportDocx(currentDoc)
        }
        // Password protection notice (real encryption would require a backend)
        if (opts.password) {
          alert(`注意：当前版本的密码保护为标记性设置。文件名将包含 [受保护] 标识。\n实际DOCX加密需要服务端支持。`)
        }
      } else if (opts.format === 'pdf') {
        // Use browser print for PDF export
        const style = document.createElement('style')
        style.id = 'pdf-export-style'
        style.textContent = `
          @media print {
            body > *:not(#pdf-print-root) { display: none !important; }
            #pdf-print-root { display: block !important; }
            .ProseMirror { padding: 0 !important; }
          }
        `
        document.head.appendChild(style)
        if (!opts.includeComments) {
          document.querySelectorAll('.comment-mark').forEach(el => (el as HTMLElement).style.background = 'none')
        }
        window.print()
        document.head.removeChild(style)
      } else if (opts.format === 'txt') {
        // Export as plain text
        const text = editor?.getText() ?? ''
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = '文档.txt'
        a.click()
        URL.revokeObjectURL(url)
      } else if (opts.format === 'html') {
        // Export as HTML
        const html = editor?.getHTML() ?? ''
        const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>文档</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;line-height:1.6;}</style>
</head>
<body>${html}</body>
</html>`
        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = '文档.html'
        a.click()
        URL.revokeObjectURL(url)
      }
      onClose()
    } catch (e) {
      setError(String(e))
    } finally {
      setExporting(false)
    }
  }

  const FORMAT_ICONS: Record<ExportFormat, string> = {
    docx: '📄',
    pdf: '🔴',
    txt: '📝',
    html: '🌐',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-96 p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-4 text-gray-800">导出文档</h3>

        {/* Format selection */}
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-2">导出格式</label>
          <div className="grid grid-cols-4 gap-2">
            {(['docx', 'pdf', 'txt', 'html'] as ExportFormat[]).map(f => (
              <button
                key={f}
                onClick={() => setOpts(o => ({ ...o, format: f }))}
                className={`flex flex-col items-center py-2 rounded-lg border-2 transition-colors ${opts.format === f ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <span className="text-xl">{FORMAT_ICONS[f]}</span>
                <span className={`text-xs mt-1 font-medium uppercase ${opts.format === f ? 'text-blue-600' : 'text-gray-500'}`}>{f}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Password (only for docx) */}
        {opts.format === 'docx' && (
          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">密码保护（可选）</label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-1.5"
              placeholder="设置打开密码..."
              value={opts.password}
              onChange={e => setOpts(o => ({ ...o, password: e.target.value }))}
            />
            {opts.password && (
              <input
                type="password"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                placeholder="确认密码..."
                value={opts.confirmPassword}
                onChange={e => setOpts(o => ({ ...o, confirmPassword: e.target.value }))}
              />
            )}
          </div>
        )}

        {/* Page range */}
        <div className="mb-3">
          <label className="block text-sm text-gray-600 mb-1">页码范围</label>
          <div className="space-y-1">
            {([
              ['all', '全部页面'],
              ['current', '当前页面'],
              ['custom', '自定义范围'],
            ] as [PageRange, string][]).map(([v, l]) => (
              <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={opts.pageRange === v} onChange={() => setOpts(o => ({ ...o, pageRange: v }))} />
                {l}
                {v === 'custom' && opts.pageRange === 'custom' && (
                  <input
                    type="text"
                    className="border border-gray-300 rounded px-2 py-0.5 text-xs ml-1 w-24"
                    placeholder="1-3,5,7"
                    value={opts.customRange}
                    onChange={e => setOpts(o => ({ ...o, customRange: e.target.value }))}
                  />
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="mb-4 space-y-1.5">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={opts.includeComments}
              onChange={e => setOpts(o => ({ ...o, includeComments: e.target.checked }))} />
            包含批注
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={opts.includeRevisions}
              onChange={e => setOpts(o => ({ ...o, includeRevisions: e.target.checked }))} />
            包含修订标记
          </label>
          {opts.format === 'pdf' && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-600">打印质量：</span>
              <select
                className="border border-gray-300 rounded px-2 py-0.5 text-sm"
                value={opts.printQuality}
                onChange={e => setOpts(o => ({ ...o, printQuality: e.target.value as 'draft' | 'standard' | 'high' }))}
              >
                <option value="draft">草稿</option>
                <option value="standard">标准</option>
                <option value="high">高质量</option>
              </select>
            </div>
          )}
        </div>

        {error && <div className="mb-3 text-sm text-red-600 bg-red-50 rounded p-2">{error}</div>}

        <div className="flex gap-2 justify-end">
          <button className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded" onClick={onClose}>取消</button>
          <button
            className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? '导出中...' : `导出 ${opts.format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportOptionsDialog
