/**
 * HeaderFooterBar — editable header/footer areas shown above/below the A4 page.
 * Displayed only when `mode` is 'header' or 'footer'.
 * Clicking outside the editing area calls onClose().
 */

import React, { useRef, useEffect } from 'react'

interface HeaderFooterBarProps {
  mode: 'header' | 'footer' | 'off'
  headerContent: string
  footerContent: string
  onHeaderChange: (v: string) => void
  onFooterChange: (v: string) => void
  onClose: () => void
}

/** Replace `#` or `{page}` in content with current page number placeholder */
function renderPreview(content: string) {
  return content.replace(/#|\{page\}/g, '1')
}

const HeaderFooterBar: React.FC<HeaderFooterBarProps> = ({
  mode,
  headerContent,
  footerContent,
  onHeaderChange,
  onFooterChange,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    if (mode === 'off') return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delayed so the initial click that opened the mode doesn't immediately close it
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 200)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', handler)
    }
  }, [mode, onClose])

  if (mode === 'off') return null

  const isHeader = mode === 'header'

  return (
    <div ref={containerRef} className="w-full" style={{ maxWidth: '210mm', margin: '0 auto' }}>
      <div className="header-footer-area">
        <span className="header-footer-label">{isHeader ? '页眉' : '页脚'}</span>
        <input
          autoFocus
          className="header-footer-input"
          type="text"
          value={isHeader ? headerContent : footerContent}
          onChange={(e) => isHeader ? onHeaderChange(e.target.value) : onFooterChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
          placeholder={isHeader ? '输入页眉内容（用 # 插入页码）' : '输入页脚内容（用 # 插入页码）'}
        />
        <div className="flex items-center justify-end gap-2 px-2 pt-1">
          <button
            type="button"
            className="text-xs text-blue-600 hover:underline"
            onClick={() => {
              if (isHeader) onHeaderChange(headerContent + '#')
              else onFooterChange(footerContent + '#')
            }}
          >
            插入页码(#)
          </button>
          <button
            type="button"
            className="text-xs text-gray-500 hover:underline"
            onClick={onClose}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

/** Non-editable display strip shown at top/bottom of A4 page */
export const HeaderFooterDisplay: React.FC<{
  content: string
  position: 'header' | 'footer'
  onClick?: () => void
}> = ({ content, position, onClick }) => {
  if (!content) return null
  return (
    <div
      className="w-full border-b border-dashed border-gray-300 pb-1 mb-2 text-xs text-gray-500 cursor-pointer hover:bg-blue-50 transition-colors"
      style={position === 'footer' ? { borderBottom: 'none', borderTop: '1px dashed #d1d5db', pt: '4px', mb: '0', mt: '8px' } : {}}
      onClick={onClick}
      title={`点击编辑${position === 'header' ? '页眉' : '页脚'}`}
    >
      {renderPreview(content)}
    </div>
  )
}

export default HeaderFooterBar
