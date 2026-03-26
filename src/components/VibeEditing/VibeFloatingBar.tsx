import React, { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { runVibeEditing } from '../../lib/vibeEditingEngine'
import type { ProgressCallback } from '../../lib/vibeEditingEngine'

interface Props {
  editor: Editor | null
}

type ToastStep = {
  type: 'thinking' | 'action' | 'observation' | 'done' | 'error'
  text: string
}

export default function VibeFloatingBar({ editor }: Props) {
  const [instruction, setInstruction] = useState('')
  const [running, setRunning] = useState(false)
  const [toast, setToast] = useState<ToastStep | null>(null)
  const [step, setStep] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (t: ToastStep) => {
    setToast(t)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    if (t.type === 'done' || t.type === 'error') {
      toastTimerRef.current = setTimeout(() => setToast(null), 3500)
    }
  }

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current) }, [])

  const handleRun = async () => {
    if (!editor || !instruction.trim() || running) return
    setRunning(true)
    setStep(0)
    showToast({ type: 'thinking', text: '正在分析指令…' })

    const onProgress: ProgressCallback = (s) => {
      showToast(s)
      if (s.type === 'action') setStep(prev => prev + 1)
    }

    try {
      const result = await runVibeEditing(instruction.trim(), editor, onProgress)
      showToast({ type: 'done', text: result })
      setInstruction('')
    } catch (err) {
      showToast({ type: 'error', text: String(err) })
    } finally {
      setRunning(false)
      setStep(0)
    }
  }

  const toastColors: Record<string, string> = {
    thinking: '#8899bb',
    action: '#00d4ff',
    observation: '#a0b4d0',
    done: '#00ffcc',
    error: '#ff6b6b',
  }
  const toastIcons: Record<string, string> = {
    thinking: '🤔',
    action: '🔧',
    observation: '👁',
    done: '✅',
    error: '❌',
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 40,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 900,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      pointerEvents: 'none',
    }}>
      {/* Progress Toast */}
      {toast && (
        <div style={{
          pointerEvents: 'none',
          background: 'rgba(10,14,30,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${toastColors[toast.type] || '#8899bb'}44`,
          borderRadius: 10,
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          color: toastColors[toast.type] || '#c8d8ff',
          boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 12px ${toastColors[toast.type] || '#8899bb'}22`,
          maxWidth: 520,
          wordBreak: 'break-all',
          animation: 'vibeToastIn 0.2s ease',
        }}>
          <span>{toastIcons[toast.type]}</span>
          <span style={{ flex: 1 }}>{toast.text.slice(0, 120)}</span>
          {running && toast.type !== 'done' && toast.type !== 'error' && (
            <span style={{ fontSize: 11, color: '#8899bb', whiteSpace: 'nowrap' }}>
              步骤 {step}
            </span>
          )}
        </div>
      )}

      {/* Floating input bar */}
      <div style={{
        pointerEvents: 'all',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(10,14,30,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(0,212,255,0.35)',
        borderRadius: 12,
        padding: '8px 10px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 20px rgba(0,212,255,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
        width: 560,
        maxWidth: 'calc(100vw - 80px)',
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>✨</span>
        <input
          ref={inputRef}
          value={instruction}
          onChange={e => setInstruction(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRun() } }}
          disabled={running}
          placeholder="描述你想要的效果… 按 Enter 执行"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#e0e8ff',
            fontSize: 13,
            lineHeight: 1.5,
            placeholder: '#4a5a7a',
          }}
        />
        {running ? (
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '2px solid rgba(178,75,255,0.3)',
            borderTopColor: '#b24bff',
            animation: 'vfbSpin 0.8s linear infinite',
            flexShrink: 0,
          }} />
        ) : (
          <button
            onClick={handleRun}
            disabled={!instruction.trim() || !editor}
            title="执行 Vibe Editing (Enter)"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: 'none',
              background: instruction.trim() && editor
                ? 'linear-gradient(135deg, #00d4ff, #b24bff)'
                : 'rgba(255,255,255,0.08)',
              color: instruction.trim() && editor ? '#fff' : '#4a5a7a',
              cursor: instruction.trim() && editor ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              flexShrink: 0,
              transition: 'all 0.15s',
              boxShadow: instruction.trim() && editor ? '0 0 12px rgba(0,212,255,0.4)' : 'none',
            }}
          >
            ↵
          </button>
        )}
      </div>

      <style>{`
        @keyframes vfbSpin { to { transform: rotate(360deg); } }
        @keyframes vibeToastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
