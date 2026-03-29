import React from 'react'
import type { EditorStats } from '../../types/editor'

interface StatusBarProps {
  stats: EditorStats
  currentPage?: number
  totalPages?: number
  lastSaved?: Date | null
  onOpenWordCount?: () => void
}

function formatSaveTime(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const StatusBar: React.FC<StatusBarProps> = ({
  stats,
  currentPage = 1,
  totalPages = 1,
  lastSaved,
  onOpenWordCount,
}) => {
  return (
    <div className="glass-statusbar flex items-center justify-between px-4 py-1 bg-blue-600 text-white text-xs select-none">
      <div className="flow-border" style={{ position: 'absolute', top: 0, left: 0, right: 0 }} />
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="hover:underline cursor-pointer"
          title="点击查看字数统计"
          onClick={onOpenWordCount}
        >
          字数：{stats.words}
        </button>
        <span>字符：{stats.characters}</span>
        <span>段落：{stats.paragraphs}</span>
      </div>
      <div className="flex items-center gap-4">
        {lastSaved ? (
          <span
            className="text-blue-200 text-xs"
            title={`上次保存时间：${lastSaved.toLocaleString('zh-CN')}`}
          >
            ✓ 已保存 {formatSaveTime(lastSaved)}
          </span>
        ) : (
          <span className="text-blue-300 text-xs">未保存</span>
        )}
        <span>
          第 {currentPage} 页 / 共 {totalPages} 页
        </span>
        <span>A4 · 210mm×297mm</span>
        <span>中文(中国)</span>
      </div>
    </div>
  )
}

export default StatusBar
