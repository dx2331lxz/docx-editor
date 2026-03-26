/**
 * VibeFloatBar — persistent floating AI input bar at the bottom of the editing area.
 * Always visible below the A4 page, glass-morphism style.
 */
import React, { useState, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import { runVibeEditing } from '../../lib/vibeEditingEngine'
import type { ProgressCallback } from '../../lib/vibeEditingEngine'

interface Props {
  editor: Editor | null
}

type ToastStep = { text: string; type: string }

export default function VibeFloatBar({ editor }: Props) {
  const [value, setValue] = useState('')
  const [running, setRunning] = useState(false)
  const [toasts, setToasts] = useState<ToastStep[]>([])
  const [done, setDone] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const toastIdRef = useRef(0)

  const addToast = (step: ToastStep) => {
    setToasts(prev => [step, ...prev].slice(0, 4))
  }

  const handleExecute = async () => {
    if (!editor || !value.trim() || running) return
    setRunning(true)
    setToasts([])
    setDone(null)

    const onProgress: ProgressCallback = (s) => {
      if (s.type !== 'observation') addToast(s)
    }

    try {
      const summary = await runVibeEditing(value.trim(), editor, onProgress)
      setDone(summary)
      setValue('')
      setTimeout(() => setDone(null), 4000)
    } catch (err) {
      addToast({ type: 'error', text: String(err) })
    } finally {
      setRunning(false)
      toastIdRef.current++
      setTimeout(() => setToasts([]), 5000)
    }
  }

  const typeColor: Record<string, string> = {
    thinking: '#8899bb',
    action: '#00d4ff',
    done: '#00ffcc',
    error: '#ff6b6b',
  }

  return (
    <div style={{
      flexShrink: 0,
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '8px 16px 12px',
      background: 'rgba(15, 20, 40, 0.75)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderTop: '1px solid rgba(0, 212, 255, 0.15)',
    }}>
      {/* Toast stack */}
      {toasts.length > 0 && (
        <div style={{
          width: '100%',
          maxWidth: 760,
          marginBottom: 6,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}>
          {toasts.map((t, i) => (
            <div key={i} style={{
              fontSize: 11,
              color: typeColor[t.type] || '#c8d8ff',
              padding: '3px 10px',
              background: 'rgba(0,0,0,0.4)',
              borderRadius: 4,
              borderLeft: `2px solid ${typeColor[t.type] || '#555'}`,
              animation: 'fadeIn 0.2s ease',
            }}>
              {t.type === 'thinking' ? '🤔' : t.type === 'action' ? '🔧' : t.type === 'done' ? '✅' : '•'} {t.text}
            </div>
          ))}
        </div>
      )}

      {/* Done banner */}
      {done && (
        <div style={{
          width: '100%', maxWidth: 760, marginBottom: 6,
          padding: '6px 12px', borderRadius: 6,
          background: 'rgba(0,255,204,0.1)', border: '1px solid rgba(0,255,204,0.25)',
          color: '#00ffcc', fontSize: 12,
        }}>
          ✅ {done}
        </div>
      )}

      {/* Input row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        maxWidth: 760,
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>✨</span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleExecute() }}
          disabled={running}
          placeholder="描述你想要的效果，例如：改成正式公文风格..."
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(0,212,255,0.25)',
            borderRadius: 8,
            color: '#e0e8ff',
            fontSize: 13,
            padding: '8px 14px',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,212,255,0.12)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.25)'; e.currentTarget.style.boxShadow = 'none' }}
        />
        <button
          onClick={handleExecute}
          disabled={running || !value.trim() || !editor}
          style={{
            padding: '8px 18px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 8,
            border: 'none',
            background: running
              ? 'rgba(178,75,255,0.3)'
              : 'linear-gradient(135deg, #00d4ff, #b24bff)',
            color: '#fff',
            cursor: running ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            boxShadow: running ? 'none' : '0 0 12px rgba(0,212,255,0.4)',
            transition: 'all 0.2s',
          }}
        >
          {running ? (
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
          ) : '→ 执行'}
        </button>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
