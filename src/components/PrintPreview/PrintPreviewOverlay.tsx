/**
 * PrintPreviewOverlay — full-screen print preview with zoom controls.
 * Accepts either editor (new) or children (legacy) for content rendering.
 */
import React, { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/react'

interface PrintPreviewOverlayProps {
  /** New API: pass the editor instance */
  editor?: Editor | null
  /** New API: close callback */
  onClose?: () => void
  /** Legacy API: exit callback */
  onExit?: () => void
  /** Legacy API: children */
  children?: React.ReactNode
}

const ZOOM_OPTIONS = [50, 75, 100, 125, 150]

const PrintPreviewOverlay: React.FC<PrintPreviewOverlayProps> = ({ editor, onClose, onExit, children }) => {
  const [zoom, setZoom] = useState(100)
  const [content, setContent] = useState('')

  const handleClose = () => { onClose?.(); onExit?.() }

  useEffect(() => {
    if (editor) {
      setContent(editor.getHTML())
    }
  }, [editor])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose, onExit])

  return (
    <div className="fixed inset-0 bg-gray-600 flex flex-col z-[100]" style={{ fontFamily: 'sans-serif' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 text-white flex-shrink-0">
        <span className="font-semibold text-sm">打印预览</span>
        <div className="flex-1" />
        {editor && (
          <>
            <label className="text-sm text-gray-300">缩放：</label>
            <select
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600"
            >
              {ZOOM_OPTIONS.map(z => (
                <option key={z} value={z}>{z}%</option>
              ))}
              <option value={0}>适应页面</option>
            </select>
          </>
        )}
        <button
          onClick={() => window.print()}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
        >
          🖨 打印
        </button>
        <button
          onClick={handleClose}
          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
        >
          关闭预览 (ESC)
        </button>
      </div>

      {/* Page area */}
      <div className="flex-1 overflow-auto py-8 flex justify-center">
        {editor ? (
          <div
            style={{
              width: '210mm',
              minHeight: '297mm',
              background: 'white',
              boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
              padding: '2.54cm',
              transformOrigin: 'top center',
              transform: zoom === 0 ? 'scale(0.75)' : `scale(${zoom / 100})`,
              fontSize: '14px',
              lineHeight: '1.6',
              boxSizing: 'border-box',
            }}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <div className="print-preview-content">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

export default PrintPreviewOverlay
