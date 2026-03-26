import React, { useState, useEffect, useRef } from 'react'
import { Editor } from '@tiptap/react'

const BUILT_IN_STYLES = [
  { name: '正文', level: 0, fontSize: '10.5pt', fontWeight: 'normal', color: '#000' },
  { name: '标题 1', level: 1, fontSize: '22pt', fontWeight: 'bold', color: '#1e40af' },
  { name: '标题 2', level: 2, fontSize: '16pt', fontWeight: 'bold', color: '#1e3a8a' },
  { name: '标题 3', level: 3, fontSize: '13.5pt', fontWeight: 'bold', color: '#374151' },
  { name: '标题 4', level: 4, fontSize: '12pt', fontWeight: 'bold', color: '#374151' },
  { name: '引用', level: 0, fontSize: '10.5pt', fontWeight: 'normal', color: '#6b7280', extra: 'italic' },
  { name: '强调', level: 0, fontSize: '10.5pt', fontWeight: 'bold', color: '#dc2626' },
  { name: '代码', level: 0, fontSize: '10pt', fontWeight: 'normal', color: '#374151', extra: 'mono' },
  { name: '列表段落', level: 0, fontSize: '10.5pt', fontWeight: 'normal', color: '#000' },
]

interface StyleQuickApplyMenuProps {
  editor: Editor | null
  position: { x: number; y: number }
  onClose: () => void
}

const StyleQuickApplyMenu: React.FC<StyleQuickApplyMenuProps> = ({ editor, position, onClose }) => {
  const [hovered, setHovered] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const kh = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', kh)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', kh)
    }
  }, [onClose])

  // Ctrl+Alt+1..9 shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.altKey) return
      const n = parseInt(e.key)
      if (n >= 1 && n <= 9 && BUILT_IN_STYLES[n - 1]) {
        e.preventDefault()
        applyStyle(BUILT_IN_STYLES[n - 1])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editor])

  function applyStyle(style: typeof BUILT_IN_STYLES[0]) {
    if (!editor) return
    const chain = editor.chain().focus()
    if (style.level && style.level >= 1 && style.level <= 6) {
      chain.toggleHeading({ level: style.level as 1|2|3|4|5|6 }).run()
    } else if (style.extra === 'italic') {
      chain.setParagraph().setMark('italic').run()
    } else {
      chain.setParagraph().run()
    }
    onClose()
  }

  // Keep menu within viewport
  const menuWidth = 220
  const menuHeight = BUILT_IN_STYLES.length * 36 + 40
  const left = Math.min(position.x, window.innerWidth - menuWidth - 8)
  const top = Math.min(position.y, window.innerHeight - menuHeight - 8)

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left,
        top,
        width: menuWidth,
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        zIndex: 3000,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '8px 12px 4px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        应用段落样式
      </div>
      {BUILT_IN_STYLES.map((style, idx) => (
        <div
          key={style.name}
          onMouseEnter={() => setHovered(style.name)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => applyStyle(style)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            height: 36,
            cursor: 'pointer',
            background: hovered === style.name ? '#eff6ff' : 'transparent',
            transition: 'background 0.1s',
          }}
        >
          <span style={{
            fontSize: Math.max(11, Math.min(14, parseInt(style.fontSize) / 1.5)),
            fontWeight: style.fontWeight as 'bold' | 'normal',
            color: style.color,
            fontStyle: style.extra === 'italic' ? 'italic' : 'normal',
            fontFamily: style.extra === 'mono' ? 'monospace' : 'inherit',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {style.name}
          </span>
          <span style={{ fontSize: 10, color: '#d1d5db', marginLeft: 8, fontFamily: 'monospace' }}>
            {idx < 9 ? `C+A+${idx + 1}` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

export default StyleQuickApplyMenu
