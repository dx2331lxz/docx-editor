import React from 'react'
import type { EditorStats } from '../../types/editor'
import { CloudSyncIndicator } from '../CloudSync/CloudSyncDialog'
import type { SyncStatus } from '../CloudSync/CloudSyncDialog'

interface StatusBarProps {
  stats: EditorStats
  currentPage?: number
  totalPages?: number
  lastSaved?: Date | null
  onOpenWordCount?: () => void
  syncStatus?: SyncStatus
  lastSyncTime?: Date | null
  onOpenCloudSync?: () => void
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
  syncStatus,
  lastSyncTime,
  onOpenCloudSync,
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
        {lastSaved && (
          <span className="text-blue-200 text-xs">✓ 已自动保存 {formatSaveTime(lastSaved)}</span>
        )}
        <span>
          第 {currentPage} 页 / 共 {totalPages} 页
        </span>
        <span>A4 · 210mm×297mm</span>
        <span>中文(中国)</span>
        {syncStatus && (
          <CloudSyncIndicator
            status={syncStatus}
            lastSyncTime={lastSyncTime ?? null}
            onClick={onOpenCloudSync}
          />
        )}
      </div>
    </div>
  )
}

export default StatusBar
