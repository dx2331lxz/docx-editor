import React, { useEffect } from 'react'
import { EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/react'

interface ReadModeOverlayProps {
  editor: Editor | null
  onExit: () => void
}

const ReadModeOverlay: React.FC<ReadModeOverlayProps> = ({ editor, onExit }) => {
  // Esc key to exit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onExit])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: '#f5f5f0',
        overflowY: 'auto',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 61,
          background: '#f5f5f0',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 24px',
        }}
      >
        <span style={{ fontSize: '14px', color: '#888' }}>📖 阅读模式</span>
        <button
          type="button"
          onClick={onExit}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            color: '#555',
          }}
        >
          退出阅读模式
          <span style={{ fontSize: '11px', color: '#aaa' }}>(Esc)</span>
        </button>
      </div>

      {/* A4-like content area */}
      <div
        style={{
          maxWidth: '800px',
          margin: '32px auto',
          background: '#fff',
          boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
          borderRadius: '4px',
          padding: '60px 72px',
          minHeight: '400px',
        }}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Page indicator */}
      <div
        style={{
          textAlign: 'center',
          padding: '16px',
          color: '#aaa',
          fontSize: '12px',
        }}
      >
        第 1 页
      </div>
    </div>
  )
}

export default ReadModeOverlay
