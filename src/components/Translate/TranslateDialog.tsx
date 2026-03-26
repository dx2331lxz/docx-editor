import React, { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/react'

interface TranslateDialogProps {
  editor: Editor | null
  initialText?: string
  onClose: () => void
}

const LANGUAGES: Record<string, string> = {
  en: '英语',
  zh: '中文',
  ja: '日语',
  ko: '韩语',
  fr: '法语',
  de: '德语',
}

function detectLang(text: string): string {
  return /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(text) ? 'zh' : 'en'
}

const TranslateDialog: React.FC<TranslateDialogProps> = ({ editor, initialText = '', onClose }) => {
  const [sourceText, setSourceText] = useState(initialText)
  const [targetLang, setTargetLang] = useState('en')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialText) {
      setSourceText(initialText)
      // Auto-switch target lang based on source
      const src = detectLang(initialText)
      setTargetLang(src === 'zh' ? 'en' : 'zh')
    }
  }, [initialText])

  const handleTranslate = async () => {
    const text = sourceText.trim()
    if (!text) return
    setLoading(true)
    setError('')
    setResult('')
    const srcLang = detectLang(text)
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${srcLang}|${targetLang}`
      )
      if (!res.ok) throw new Error('网络错误')
      const data = await res.json() as { responseData?: { translatedText?: string }; responseStatus?: number }
      if (data.responseData?.translatedText) {
        setResult(data.responseData.translatedText)
      } else {
        throw new Error('翻译失败，请稍后重试')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '翻译出错')
    } finally {
      setLoading(false)
    }
  }

  const handleReplace = () => {
    if (!editor || !result) return
    const { from, to } = editor.state.selection
    if (from === to) {
      editor.chain().focus().insertContent(result).run()
    } else {
      editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, result).run()
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[580px] max-w-[95vw] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">🌐 快速翻译</h2>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5 flex flex-col gap-4">
          {/* Source */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">原文</label>
            <textarea
              className="w-full h-28 border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-400"
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="输入要翻译的文字…"
            />
          </div>

          {/* Target lang + Translate button */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 flex-shrink-0">翻译为：</label>
            <select
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
            >
              {Object.entries(LANGUAGES).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
            <button
              type="button"
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              onClick={handleTranslate}
              disabled={loading || !sourceText.trim()}
            >
              {loading ? '翻译中…' : '翻译'}
            </button>
          </div>

          {/* Result */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">译文</label>
            {loading ? (
              <div className="flex items-center justify-center h-24 border border-gray-200 rounded bg-gray-50">
                <span className="text-gray-400 text-sm animate-pulse">正在翻译…</span>
              </div>
            ) : (
              <textarea
                readOnly
                className="w-full h-28 border border-gray-200 rounded px-3 py-2 text-sm resize-none bg-gray-50 text-gray-800"
                value={result}
                placeholder="翻译结果将显示在这里"
              />
            )}
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200">
          {result && (
            <button
              type="button"
              className="px-4 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              onClick={handleReplace}
            >
              替换选中文字
            </button>
          )}
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

export default TranslateDialog
