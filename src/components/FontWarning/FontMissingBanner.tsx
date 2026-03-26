import React from 'react'

interface Props {
  missingFonts: string[]
  onDismiss: () => void
}

const FontMissingBanner: React.FC<Props> = ({ missingFonts, onDismiss }) => {
  if (missingFonts.length === 0) return null
  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-yellow-50 border-b border-yellow-300 text-yellow-800 text-xs flex-shrink-0">
      <span>
        ⚠️ 字体未找到：<strong>{missingFonts.join('、')}</strong>，已替换为默认字体
      </span>
      <button
        onClick={onDismiss}
        className="ml-4 text-yellow-700 hover:text-yellow-900 font-medium"
      >
        忽略 ×
      </button>
    </div>
  )
}

export default FontMissingBanner
