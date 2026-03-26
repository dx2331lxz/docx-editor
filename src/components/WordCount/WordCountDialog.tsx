/**
 * WordCountDialog — shows detailed document statistics.
 * Triggered from 审阅 → 字数统计
 */
import React, { useMemo } from 'react'
import type { Editor } from '@tiptap/react'
import { X, FileText } from 'lucide-react'

interface WordCountDialogProps {
  editor: Editor
  onClose: () => void
}

function computeStats(editor: Editor) {
  const doc = editor.state.doc
  const fullText = doc.textContent

  // Chinese character count (CJK unified)
  const chineseChars = (fullText.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) || []).length
  // English words
  const englishWords = (fullText.match(/[a-zA-Z]+/g) || []).length
  // Total chars excluding spaces
  const charsNoSpace = fullText.replace(/\s/g, '').length
  // Total chars including spaces
  const charsWithSpace = fullText.length
  // Paragraphs
  let paragraphs = 0
  let lines = 0
  doc.descendants((node) => {
    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      if (node.textContent.trim().length > 0) paragraphs++
      // Rough line estimate: every ~60 chars = 1 line
      lines += Math.max(1, Math.ceil(node.textContent.length / 60))
    }
  })
  // Total "words" = Chinese chars + English words
  const totalWords = chineseChars + englishWords

  return { chineseChars, englishWords, totalWords, charsNoSpace, charsWithSpace, paragraphs, lines }
}

const Row: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <tr className="border-b border-gray-100">
    <td className="py-2 px-4 text-sm text-gray-600 w-40">{label}</td>
    <td className="py-2 px-4 text-sm font-medium text-gray-900 text-right">{value.toLocaleString()}</td>
  </tr>
)

const WordCountDialog: React.FC<WordCountDialogProps> = ({ editor, onClose }) => {
  const stats = useMemo(() => computeStats(editor), [editor])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-2xl w-80 border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="font-semibold text-gray-800 flex items-center gap-2">
            <FileText size={16} className="text-blue-500" />
            字数统计
          </span>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div className="p-2">
          <table className="w-full">
            <tbody>
              <Row label="字数（中文字符）" value={stats.chineseChars} />
              <Row label="英文单词数" value={stats.englishWords} />
              <Row label="总字数" value={stats.totalWords} />
              <Row label="字符数（含空格）" value={stats.charsWithSpace} />
              <Row label="字符数（不含空格）" value={stats.charsNoSpace} />
              <Row label="段落数" value={stats.paragraphs} />
              <Row label="行数（估算）" value={stats.lines} />
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end">
          <button
            type="button"
            className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={onClose}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

export default WordCountDialog
