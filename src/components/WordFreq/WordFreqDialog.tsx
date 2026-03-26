import React, { useState, useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/react'

interface WordFreqDialogProps {
  editor: Editor | null
  onClose: () => void
}

interface WordEntry {
  word: string
  count: number
  pct: string
}

function computeFrequency(text: string, minLen: number): WordEntry[] {
  const freq: Record<string, number> = {}

  // Extract English words
  const englishMatches = text.match(/[a-zA-Z]{2,}/g) ?? []
  for (const w of englishMatches) {
    const lower = w.toLowerCase()
    if (lower.length >= minLen) {
      freq[lower] = (freq[lower] ?? 0) + 1
    }
  }

  // Extract Chinese bigrams from consecutive CJK character runs
  const chineseSegments = text.match(/[\u4e00-\u9fff]+/g) ?? []
  for (const seg of chineseSegments) {
    for (let i = 0; i <= seg.length - minLen; i++) {
      const bigram = seg.slice(i, i + 2)
      if (bigram.length >= minLen) {
        freq[bigram] = (freq[bigram] ?? 0) + 1
      }
    }
  }

  const total = Object.values(freq).reduce((a, b) => a + b, 0)
  const entries: WordEntry[] = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([word, count]) => ({
      word,
      count,
      pct: total > 0 ? ((count / total) * 100).toFixed(2) : '0.00',
    }))

  return entries
}

const WordFreqDialog: React.FC<WordFreqDialogProps> = ({ editor, onClose }) => {
  const [minLen, setMinLen] = useState(2)
  const [entries, setEntries] = useState<WordEntry[]>([])
  const computedRef = useRef(false)

  useEffect(() => {
    if (!editor || computedRef.current) return
    computedRef.current = true
    const text = editor.getText()
    setEntries(computeFrequency(text, minLen))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  useEffect(() => {
    if (!editor) return
    const text = editor.getText()
    setEntries(computeFrequency(text, minLen))
  }, [minLen, editor])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[520px] max-w-[95vw] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">📊 词频统计</h2>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50">
          <label className="text-sm text-gray-700">最小词长：{minLen}</label>
          <input
            type="range"
            min={2}
            max={6}
            value={minLen}
            onChange={(e) => setMinLen(Number(e.target.value))}
            className="w-32"
          />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-5 py-3">
          {entries.length === 0 ? (
            <div className="text-center text-gray-400 py-8">文档内容为空或无匹配词语</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="pb-2 pr-4">词语</th>
                  <th className="pb-2 pr-4 text-right">出现次数</th>
                  <th className="pb-2 text-right">占比%</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-1.5 pr-4 font-medium text-gray-800">{entry.word}</td>
                    <td className="py-1.5 pr-4 text-right text-gray-600">{entry.count}</td>
                    <td className="py-1.5 text-right text-gray-500">{entry.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-3 border-t border-gray-200">
          <button
            type="button"
            className="px-4 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
            onClick={onClose}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

export default WordFreqDialog
