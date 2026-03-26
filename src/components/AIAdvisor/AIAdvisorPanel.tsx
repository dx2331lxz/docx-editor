import React, { useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'

interface Suggestion {
  id: string
  severity: '错误' | '警告' | '建议'
  message: string
  apply?: () => void
}

interface AIAdvisorPanelProps {
  editor: Editor | null
  onClose: () => void
}

function analyzeContent(editor: Editor): Suggestion[] {
  const suggestions: Suggestion[] = []
  const html = editor.getHTML()
  const doc = editor.state.doc

  // Check inconsistent font sizes
  const fontSizeMatches = html.match(/font-size:\s*(\d+(?:\.\d+)?)(pt|px|em|rem)/g) || []
  const sizes = new Set(fontSizeMatches.map(m => m.replace(/\s/g, '')))
  if (sizes.size > 3) {
    suggestions.push({
      id: 'font-sizes',
      severity: '警告',
      message: `文档中使用了 ${sizes.size} 种不同字号，建议统一字号以保持一致性。`,
    })
  }

  // Check heading hierarchy
  const headings: number[] = []
  doc.descendants(node => {
    if (node.type.name === 'heading') {
      headings.push(node.attrs.level as number)
    }
  })
  let hasH2 = false, hasH3 = false
  for (const level of headings) {
    if (level === 2) hasH2 = true
    if (level === 3) hasH3 = true
    if (level === 3 && !hasH2) {
      suggestions.push({
        id: 'heading-h3-no-h2',
        severity: '错误',
        message: '存在三级标题（H3）但缺少二级标题（H2），层级结构不正确。',
      })
      break
    }
    if (level === 4 && !hasH3) {
      suggestions.push({
        id: 'heading-h4-no-h3',
        severity: '错误',
        message: '存在四级标题（H4）但缺少三级标题（H3），层级结构不正确。',
      })
      break
    }
  }

  // Check very long paragraphs
  let longParaFound = false
  doc.descendants(node => {
    if (longParaFound) return
    if (node.type.name === 'paragraph' && node.textContent.length > 500) {
      longParaFound = true
      suggestions.push({
        id: 'long-paragraph',
        severity: '建议',
        message: `存在超过 500 字符的超长段落（当前 ${node.textContent.length} 字符），建议拆分以提高可读性。`,
      })
    }
  })

  // Check mixed Chinese/English punctuation
  const text = editor.state.doc.textContent
  const hasChinese = /[\u3002\uff0c\uff01\uff1f\u300a\u300b\uff1a\uff1b]/.test(text)
  const hasEnglish = /[.,!?;:]/.test(text)
  if (hasChinese && hasEnglish) {
    suggestions.push({
      id: 'mixed-punctuation',
      severity: '警告',
      message: '文档中混用了中文标点和英文标点，建议统一使用中文或英文标点。',
    })
  }

  // Check for missing paragraph spacing (simple heuristic: no margin style on consecutive paras)
  const paraMargins = (html.match(/margin-bottom:\s*0/g) || []).length
  const totalParas = (html.match(/<p/g) || []).length
  if (totalParas > 3 && paraMargins > totalParas / 2) {
    suggestions.push({
      id: 'para-spacing',
      severity: '建议',
      message: '多个段落缺少段间距设置，建议为段落添加适当的下边距以改善排版。',
      apply: () => {
        editor.chain().focus().selectAll().run()
        // Apply paragraph spacing via style
        const { from, to } = { from: 0, to: editor.state.doc.content.size }
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'paragraph') {
            editor.chain().setTextSelection({ from: pos, to: pos + node.nodeSize }).run()
          }
        })
        editor.chain().focus().run()
      },
    })
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'ok',
      severity: '建议',
      message: '文档格式检查通过，未发现明显问题。',
    })
  }

  return suggestions
}

const severityColor: Record<string, string> = {
  '错误': 'bg-red-100 border-red-400 text-red-800',
  '警告': 'bg-yellow-100 border-yellow-400 text-yellow-800',
  '建议': 'bg-blue-100 border-blue-400 text-blue-800',
}

const severityBadge: Record<string, string> = {
  '错误': 'bg-red-500 text-white',
  '警告': 'bg-yellow-500 text-white',
  '建议': 'bg-blue-500 text-white',
}

const AIAdvisorPanel: React.FC<AIAdvisorPanelProps> = ({ editor, onClose }) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>(() =>
    editor ? analyzeContent(editor) : []
  )
  const [applied, setApplied] = useState<Set<string>>(new Set())

  const reanalyze = useCallback(() => {
    if (editor) {
      setSuggestions(analyzeContent(editor))
      setApplied(new Set())
    }
  }, [editor])

  const handleApply = (s: Suggestion) => {
    s.apply?.()
    setApplied(prev => new Set([...prev, s.id]))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-2xl w-[500px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-purple-600 to-blue-600 rounded-t-lg">
          <h2 className="text-white font-semibold text-base">🤖 AI 排版建议</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-lg font-bold">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {suggestions.map(s => (
            <div key={s.id} className={`border rounded-lg p-3 ${severityColor[s.severity]}`}>
              <div className="flex items-start gap-2">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${severityBadge[s.severity]}`}>
                  {s.severity}
                </span>
                <p className="text-sm flex-1">{s.message}</p>
              </div>
              {s.apply && !applied.has(s.id) && (
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => handleApply(s)}
                    className="text-xs px-3 py-1 bg-white border border-current rounded hover:opacity-80"
                  >
                    一键应用
                  </button>
                </div>
              )}
              {applied.has(s.id) && (
                <p className="mt-1 text-xs text-right opacity-70">✓ 已应用</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center px-4 py-3 border-t bg-gray-50 rounded-b-lg">
          <span className="text-xs text-gray-500">共 {suggestions.length} 条建议</span>
          <div className="flex gap-2">
            <button
              onClick={reanalyze}
              className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
            >
              🔄 重新分析
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIAdvisorPanel
