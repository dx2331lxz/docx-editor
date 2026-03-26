/**
 * DraftRecoveryBanner — shown when a prior auto-save draft is detected.
 * User can restore or dismiss.
 */
import React from 'react'
import { RotateCcw, X, Clock } from 'lucide-react'

interface DraftRecoveryBannerProps {
  savedAt: Date
  onRestore: () => void
  onDismiss: () => void
}

function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const DraftRecoveryBanner: React.FC<DraftRecoveryBannerProps> = ({ savedAt, onRestore, onDismiss }) => {
  return (
    <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-3 bg-amber-50 border border-amber-300 text-amber-800 text-sm px-4 py-2 rounded-lg shadow-lg">
      <Clock size={14} className="text-amber-500 flex-shrink-0" />
      <span>检测到草稿（保存于 {formatTime(savedAt)}），是否恢复？</span>
      <button
        type="button"
        className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500 text-white hover:bg-amber-600 text-xs font-medium"
        onClick={onRestore}
      >
        <RotateCcw size={11} />
        恢复
      </button>
      <button
        type="button"
        className="flex items-center gap-1 px-2 py-0.5 rounded border border-amber-400 text-amber-700 hover:bg-amber-100 text-xs"
        onClick={onDismiss}
      >
        <X size={11} />
        忽略
      </button>
    </div>
  )
}

export default DraftRecoveryBanner
