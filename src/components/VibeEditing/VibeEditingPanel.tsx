import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { runVibeEditing } from '../../lib/vibeEditingEngine'
import type { ProgressCallback, Message } from '../../lib/vibeEditingEngine'
import type { PageConfig } from '../PageSetup/PageSetupDialog'

interface Props {
  editor: Editor | null
  onClose: () => void
  width?: number
  onWidthChange?: (w: number) => void
  onPageConfigChange?: (updater: (prev: PageConfig) => PageConfig) => void
}

type StepEntry = {
  id: number
  type: 'thinking' | 'thinking_stream' | 'action' | 'observation' | 'done' | 'error'
  text: string
}

type ChatMessage =
  | { role: 'user'; text: string }
  | { role: 'ai'; steps: StepEntry[]; summary: string | null; done: boolean }

type Mode = 'ask' | 'edit' | 'agent'

interface ChatSession {
  id: string
  mode: Mode
  title: string
  createdAt: number
  messages: ChatMessage[]
}

const SESSIONS_KEY = 'vibe-editing-sessions'

const PRESETS = [
  { label: '🏛️ 正式公文风格', value: '将这篇文章改写为正式公文风格：使用规范的公文标题格式，段落缩进两字符，措辞正式严谨，去除口语化表达，标题层级规范化（主标题用 h1，小标题用 h2/h3）' },
  { label: '🍎 苹果简约风', value: '按照苹果风格重新排版：大标题简洁有力，段落简短（每段不超过3句），增加空白感，去除冗余文字，关键词加粗，整体简洁现代' },
  { label: '📚 学术论文格式', value: '将文档改为学术论文格式：调用 summarize_document 生成摘要插入开头，语言学术严谨，normalize_headings 规范标题层级' },
  { label: '💼 商业报告风格', value: '转换为商业报告格式：添加执行摘要，正文用要点列表展示，结论和建议单独成节，apply_document_theme business 应用商务主题' },
  { label: '🧹 一键清理格式', value: '清理文档中所有多余格式：remove_extra_spaces 清空格，remove_extra_blank_lines 清空行，normalize_headings 规范标题，整体排版整洁统一' },
  { label: '🎨 添加彩色主题', value: '为文档应用彩色活力主题：apply_document_theme colorful，apply_heading_style background，让文档充满色彩活力' },
  { label: '📑 规范标题层级', value: '规范文档所有标题的层级结构：normalize_headings 确保 h1/h2/h3 层级正确，apply_heading_style bordered 添加左边框强调，让文档结构清晰' },
  { label: '💧 添加公司水印', value: '为文档添加水印：add_watermark 文字为"机密文件"，透明度 0.08，同时 apply_document_theme business 应用商务风格' },
]

const STEP_ICON: Record<string, string> = { thinking: '🤔', thinking_stream: '💭', action: '🔧', observation: '👁', done: '✅', error: '❌', ask_continue: '⏸' }
const STEP_COLOR: Record<string, string> = {
  thinking: '#8899bb',
  thinking_stream: '#9966cc',
  action: '#00d4ff',
  observation: '#4fc',
  done: '#00ffcc',
  error: '#ff6b6b',
  ask_continue: '#f0c060',
}

const MODE_LABELS: Record<Mode, string> = { ask: 'ASK', edit: 'EDIT', agent: 'AGENT' }
const MODE_DESC: Record<Mode, string> = {
  ask: '问答 · 不修改文档',
  edit: '精确编辑 · 针对指定内容',
  agent: '智能代理 · 自主规划 · 多步执行',
}
const MODE_PLACEHOLDER: Record<Mode, string> = {
  ask: '问我关于这篇文档的任何问题...',
  edit: '描述你想修改的内容（选中文字后可直接描述）...',
  agent: '描述你想要的整体效果，AI 会自主规划执行...',
}
const MODE_BADGE_COLOR: Record<Mode, string> = {
  ask: '#00d4ff',
  edit: '#4fc3a1',
  agent: '#b24bff',
}

let gStepId = 0

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
}

function loadSessions(): ChatSession[] {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, 20)))
}

export default function VibeEditingPanel({ editor, onClose, width = 360, onWidthChange, onPageConfigChange }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationHistory, setConversationHistory] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [presetsOpen, setPresetsOpen] = useState(true)
  const [mode, setMode] = useState<Mode>('agent')
  const [showHistory, setShowHistory] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [viewingSession, setViewingSession] = useState<ChatSession | null>(null)
  const [askContinueResolver, setAskContinueResolver] = useState<((v: boolean) => void) | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastSavedAtRef = useRef(0) // 记录上次保存时间，防止重复保存

  // Drag-resize handle
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width
    const onMove = (mv: MouseEvent) => {
      const newWidth = Math.max(280, Math.min(600, startWidth + (startX - mv.clientX)))
      onWidthChange?.(newWidth)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [width, onWidthChange])

  useEffect(() => {
    setSessions(loadSessions())
  }, [showHistory])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const resizeTextarea = useCallback((el?: HTMLTextAreaElement | null) => {
    const target = el ?? textareaRef.current
    if (!target) return
    target.style.height = 'auto'
    target.style.height = Math.min(target.scrollHeight, 200) + 'px'
  }, [])

  // Resize textarea after every input state change (runs after React DOM update)
  useEffect(() => {
    resizeTextarea()
  }, [input, resizeTextarea])

  const saveSession = useCallback((msgs: ChatMessage[], sessionMode: Mode) => {
    if (msgs.length === 0) return
    const firstUserMsg = msgs.find(m => m.role === 'user')
    const title = firstUserMsg
      ? (firstUserMsg as { role: 'user'; text: string }).text.slice(0, 20)
      : '无标题'
    const session: ChatSession = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      mode: sessionMode,
      title,
      createdAt: Date.now(),
      messages: msgs,
    }
    const existing = loadSessions()
    saveSessions([session, ...existing])
  }, [])

  // 会话完成时保存（AI 消息有 done: true）——必须在 saveSession 定义之后
  useEffect(() => {
    if (messages.length < 2) return // 至少有用户消息 + AI 消息
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.role !== 'ai' || !lastMsg.done) return

    // 检查是否刚保存过（5秒内不重复保存）
    const now = Date.now()
    if (now - lastSavedAtRef.current < 5000) return
    lastSavedAtRef.current = now

    saveSession(messages, mode)
  }, [messages, mode, saveSession])

  const runAskMode = async (
    question: string,
    doc_text: string,
    _onChunk: (t: string) => void,
    history?: Message[],
  ): Promise<string> => {
    const resp = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer sk-tsecqgrifovrucwvcdvcyzzjluxrpsehbishnwgamhjozwsw',
      },
      body: JSON.stringify({
        model: 'Pro/moonshotai/Kimi-K2.5',
        messages: [
          {
            role: 'system',
            content: `你是一个文档助手。以下是用户的文档内容：\n\n${doc_text.slice(0, 4000)}\n\n请根据文档内容回答用户的问题，不要修改文档，只提供信息和建议。`,
          },
          ...(history ?? []),
          { role: 'user', content: question },
        ],
        max_tokens: 1000,
        stream: false,
      }),
    })
    const data = await resp.json()
    return data.choices?.[0]?.message?.content ?? '无法获取回答'
  }

  const handleSwitchMode = (newMode: Mode) => {
    if (newMode === mode) return
    if (messages.length > 0 && !confirm('切换模式将清空当前对话，确定吗？')) return
    setMessages([])
    setConversationHistory([])
    setMode(newMode)
  }

  const handleSend = useCallback(async (text?: string) => {
    const inst = (text ?? input).trim()
    if (!editor || !inst || running) return

    setInput('')
    setTimeout(resizeTextarea, 0)
    setRunning(true)

    const userMsg: ChatMessage = { role: 'user', text: inst }
    setMessages(prev => [...prev, userMsg])

    const aiPlaceholder: ChatMessage = { role: 'ai', steps: [], summary: null, done: false }
    setMessages(prev => [...prev, aiPlaceholder])

    const onProgress: ProgressCallback = (s) => {
      gStepId++
      if (s.type === 'thinking_stream') {
        // Update last thinking_stream step in-place, or create it
        setMessages(prev => {
          const next = [...prev]
          const aiMsg = next[next.length - 1]
          if (aiMsg?.role !== 'ai') return prev
          const steps = [...aiMsg.steps]
          const lastIdx = steps.length - 1
          if (lastIdx >= 0 && steps[lastIdx].type === 'thinking_stream') {
            steps[lastIdx] = { ...steps[lastIdx], text: s.text }
          } else {
            steps.push({ id: gStepId, type: 'thinking_stream', text: s.text })
          }
          return [...next.slice(0, -1), { ...aiMsg, steps }]
        })
        return
      }
      if (s.type === 'ask_continue') {
        // Handled separately via askContinueResolver — just record the step
        setMessages(prev => {
          const next = [...prev]
          const aiMsg = next[next.length - 1]
          if (aiMsg?.role !== 'ai') return prev
          return [
            ...next.slice(0, -1),
            { ...aiMsg, steps: [...aiMsg.steps, { id: gStepId, ...s }] },
          ]
        })
        return
      }
      setMessages(prev => {
        const next = [...prev]
        const aiMsg = next[next.length - 1]
        if (aiMsg?.role !== 'ai') return prev
        return [
          ...next.slice(0, -1),
          { ...aiMsg, steps: [...aiMsg.steps, { id: gStepId, ...s }] },
        ]
      })
    }

    const onAskContinue = (): Promise<boolean> =>
      new Promise<boolean>(resolve => {
        setAskContinueResolver(() => resolve)
      })

    try {
      let summary: string

      if (mode === 'ask') {
        const docText = editor.getText()
        summary = await runAskMode(inst, docText, () => {}, conversationHistory)
        setMessages(prev => {
          const next = [...prev]
          const aiMsg = next[next.length - 1]
          if (aiMsg?.role !== 'ai') return prev
          return [...next.slice(0, -1), { ...aiMsg, summary, done: true }]
        })
      } else {
        const effectiveInst = mode === 'edit' ? `【精确编辑模式】${inst}` : inst
        summary = await runVibeEditing(effectiveInst, editor, onProgress, onAskContinue, onPageConfigChange, conversationHistory)
        setMessages(prev => {
          const next = [...prev]
          const aiMsg = next[next.length - 1]
          if (aiMsg?.role !== 'ai') return prev
          return [...next.slice(0, -1), { ...aiMsg, summary, done: true }]
        })
      }

      // Append this round to conversation history (keep max 20 entries = 10 rounds)
      setConversationHistory(prev => [
        ...prev,
        { role: 'user' as const, content: inst },
        { role: 'assistant' as const, content: summary },
      ].slice(-20))
    } catch (err) {
      gStepId++
      setMessages(prev => {
        const next = [...prev]
        const aiMsg = next[next.length - 1]
        if (aiMsg?.role !== 'ai') return prev
        return [
          ...next.slice(0, -1),
          {
            ...aiMsg,
            steps: [...aiMsg.steps, { id: gStepId, type: 'error' as const, text: String(err) }],
            summary: '编辑过程出现错误，请重试。',
            done: true,
          },
        ]
      })
    } finally {
      setRunning(false)
      setAskContinueResolver(null)
      textareaRef.current?.focus()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, input, running, resizeTextarea, mode, saveSession, conversationHistory])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const startNewSession = () => {
    setMessages([])
    setConversationHistory([])
    setViewingSession(null)
    setShowHistory(false)
  }

  const displayedMessages = viewingSession ? viewingSession.messages : messages
  const isReadOnly = viewingSession !== null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width,
      flexShrink: 0,
      zIndex: 1100,
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(10, 14, 30, 0.97)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderLeft: '1px solid rgba(178, 75, 255, 0.3)',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.4)',
    }}>
      {/* Drag-resize handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          cursor: 'col-resize',
          zIndex: 10,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,212,255,0.4)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      />

      {/* ── Title bar ─────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'linear-gradient(135deg, rgba(0,212,255,0.07), rgba(178,75,255,0.07))',
      }}>
        <div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#e0e8ff' }}>✨ Vibe Editing</span>
          <span style={{ fontSize: 11, color: '#6677aa', marginLeft: 8 }}>AI 驱动 · 30+ 工具</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => { setShowHistory(v => !v); setViewingSession(null) }}
            title="历史记录"
            style={{
              background: showHistory ? 'rgba(0,212,255,0.12)' : 'none',
              border: 'none',
              color: showHistory ? '#00d4ff' : '#6677aa',
              cursor: 'pointer',
              fontSize: 16,
              padding: '2px 6px',
              borderRadius: 6,
              lineHeight: 1,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e0e8ff')}
            onMouseLeave={e => (e.currentTarget.style.color = showHistory ? '#00d4ff' : '#6677aa')}
          >🕐</button>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#6677aa', cursor: 'pointer',
            fontSize: 18, padding: '2px 6px', borderRadius: 6, lineHeight: 1,
            transition: 'color 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e0e8ff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6677aa')}
          >✕</button>
        </div>
      </div>

      {/* ── Mode tabs ─────────────────────────────── */}
      {!showHistory && (
        <div style={{
          flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(0,0,0,0.15)',
          padding: '0 12px',
        }}>
          <div style={{ display: 'flex', gap: 0 }}>
            {(['ask', 'edit', 'agent'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => handleSwitchMode(m)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: mode === m ? '2px solid #00d4ff' : '2px solid transparent',
                  color: mode === m ? '#fff' : '#6677aa',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: mode === m ? 600 : 400,
                  padding: '8px 16px 6px',
                  letterSpacing: '0.05em',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: '#445577', padding: '3px 2px 5px', letterSpacing: '0.02em' }}>
            {MODE_DESC[mode]}
          </div>
        </div>
      )}

      {/* ── History panel OR Chat area ─────────────── */}
      {showHistory ? (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#8899bb', fontWeight: 600 }}>最近对话</span>
            <button
              onClick={startNewSession}
              style={{
                background: 'rgba(0,212,255,0.1)',
                border: '1px solid rgba(0,212,255,0.25)',
                borderRadius: 8,
                color: '#00d4ff',
                cursor: 'pointer',
                fontSize: 11,
                padding: '4px 10px',
              }}
            >
              + 新对话
            </button>
          </div>

          {/* Session list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {sessions.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#445577', fontSize: 13 }}>
                  暂无历史记录
                </div>
              )}
              {sessions.slice(0, 10).map(sess => (
                <button
                  key={sess.id}
                  onClick={() => {
                    // Load history session as active context (not readonly)
                    setMessages(sess.messages)
                    setMode(sess.mode)
                    // Reconstruct conversation history from saved messages
                    const rebuilt: Message[] = []
                    for (const m of sess.messages) {
                      if (m.role === 'user') {
                        rebuilt.push({ role: 'user', content: m.text })
                      } else if (m.role === 'ai' && m.done && m.summary) {
                        rebuilt.push({ role: 'assistant', content: m.summary })
                      }
                    }
                    setConversationHistory(rebuilt.slice(-20))
                    setShowHistory(false)
                    setViewingSession(null)
                  }}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    textAlign: 'left',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{
                    flexShrink: 0,
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: `${MODE_BADGE_COLOR[sess.mode]}22`,
                    color: MODE_BADGE_COLOR[sess.mode],
                    border: `1px solid ${MODE_BADGE_COLOR[sess.mode]}44`,
                    letterSpacing: '0.04em',
                  }}>
                    {MODE_LABELS[sess.mode]}
                  </span>
                  <span style={{ flex: 1, fontSize: 12, color: '#b0c4de', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sess.title}
                  </span>
                  <span style={{ flexShrink: 0, fontSize: 10, color: '#445577' }}>{relativeTime(sess.createdAt)}</span>
                </button>
              ))}
            </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
              <div style={{ fontSize: 14, color: '#6677aa', lineHeight: 1.6 }}>
                {mode === 'ask' ? '向 AI 提问关于文档的任何问题' : mode === 'edit' ? '描述你想精确修改的内容' : '描述你想要的文档效果'}
                <br />
                {mode === 'agent' ? 'AI 将自动选择并组合工具执行' : ''}
              </div>
            </div>
          )}
          {renderMessages(messages)}
          <div ref={bottomRef} />
        </div>
      )}

      {/* ── Presets (collapsible, hidden during history) ── */}
      {!showHistory && (
        <div style={{
          flexShrink: 0,
          borderTop: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <button
            onClick={() => setPresetsOpen(v => !v)}
            style={{
              width: '100%', background: 'none', border: 'none',
              padding: '8px 14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              color: '#6677aa', fontSize: 11,
            }}
          >
            <span style={{
              display: 'inline-block',
              transform: presetsOpen ? 'rotate(90deg)' : 'none',
              transition: 'transform 0.2s',
            }}>▶</span>
            快捷预设
          </button>

          {presetsOpen && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, padding: '0 10px 10px' }}>
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => { setInput(p.value); textareaRef.current?.focus() }}
                  disabled={running}
                  style={{
                    padding: '5px 8px',
                    fontSize: 10.5,
                    background: 'rgba(0,212,255,0.06)',
                    border: '1px solid rgba(0,212,255,0.15)',
                    borderRadius: 8,
                    color: '#9bbfe0',
                    cursor: 'pointer',
                    textAlign: 'left',
                    lineHeight: 1.3,
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,212,255,0.14)'; e.currentTarget.style.borderColor = 'rgba(0,212,255,0.35)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,212,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(0,212,255,0.15)' }}
                  title={p.value}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Input area (hidden during history browse) ─ */}
      {!showHistory && (
        <div style={{
          flexShrink: 0,
          borderTop: '1px solid rgba(0,212,255,0.18)',
          padding: '10px 12px 12px',
          background: 'rgba(10,14,30,0.95)',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              // 直接在事件目标上调整高度，避免 React re-render 覆盖
              const el = e.target
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 200) + 'px'
            }}
            onKeyDown={handleKeyDown}
            disabled={running}
            placeholder={MODE_PLACEHOLDER[mode]}
            rows={1}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(0,212,255,0.2)',
              borderRadius: 10,
              color: '#e0e8ff',
              fontSize: 13,
              padding: '9px 12px',
              outline: 'none',
              resize: 'none',
              lineHeight: 1.5,
              fontFamily: 'inherit',
              minHeight: 80,
              maxHeight: 200,
              overflow: 'hidden',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.5)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.2)' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={running || !input.trim() || !editor}
            style={{
              flexShrink: 0,
              width: 38,
              height: 38,
              borderRadius: 10,
              border: 'none',
              background: running || !input.trim()
                ? 'rgba(0,212,255,0.12)'
                : 'linear-gradient(135deg, #00d4ff, #b24bff)',
              color: running || !input.trim() ? 'rgba(0,212,255,0.35)' : '#fff',
              cursor: running || !input.trim() ? 'not-allowed' : 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              boxShadow: running || !input.trim() ? 'none' : '0 0 12px rgba(0,212,255,0.35)',
            }}
            title="发送 (Enter)"
          >
            {running
              ? <span style={{ display: 'inline-block', animation: 'vspin 1s linear infinite' }}>⟳</span>
              : '↑'}
          </button>
        </div>
      )}

      <style>{`
        @keyframes vspin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes vblink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  )

  function renderMessages(msgs: ChatMessage[]) {
    return msgs.map((msg, i) =>
      msg.role === 'user' ? (
        <div key={i} style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{
            maxWidth: '85%',
            padding: '10px 14px',
            borderRadius: '12px 12px 2px 12px',
            background: 'rgba(0,212,255,0.1)',
            borderLeft: '2px solid rgba(0,212,255,0.5)',
            color: '#c8e8ff',
            fontSize: 13,
            lineHeight: 1.6,
            wordBreak: 'break-word',
          }}>
            {msg.text}
          </div>
        </div>
      ) : (
        <div key={i} style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <div style={{
            maxWidth: '95%',
            padding: '10px 12px',
            borderRadius: '2px 12px 12px 12px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            fontSize: 12,
            lineHeight: 1.7,
            minWidth: 120,
          }}>
            {msg.steps.map((step, si) => (
              <div key={`${i}-${step.id}-${si}`} style={{ display: 'flex', gap: 6, marginBottom: 3, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0 }}>{STEP_ICON[step.type] || '•'}</span>
                <span style={{
                  color: STEP_COLOR[step.type] || '#c8d8ff',
                  fontStyle: step.type === 'thinking' ? 'italic' : 'normal',
                  wordBreak: 'break-word',
                  flex: 1,
                }}>
                  {step.type === 'thinking_stream' ? (
                    <span style={{
                      display: 'block',
                      maxHeight: step.text.length > 200 ? 80 : undefined,
                      overflowY: step.text.length > 200 ? 'auto' : undefined,
                      fontStyle: 'italic',
                      opacity: 0.85,
                      fontSize: 11,
                      lineHeight: 1.5,
                      padding: '2px 6px',
                      background: 'rgba(153,102,204,0.08)',
                      borderRadius: 4,
                      borderLeft: '2px solid rgba(153,102,204,0.4)',
                    }}>
                      {step.text || '…'}
                      {!msg.done && <span style={{ animation: 'vblink 1s step-end infinite', marginLeft: 1 }}>▌</span>}
                    </span>
                  ) : step.type === 'observation'
                    ? step.text.slice(0, 60) + (step.text.length > 60 ? '…' : '')
                    : step.text}
                  {step.type === 'ask_continue' && askContinueResolver && (
                    <span style={{ display: 'inline-flex', gap: 6, marginLeft: 8 }}>
                      <button onClick={() => { askContinueResolver(true); setAskContinueResolver(null) }}
                        style={{ background: 'rgba(0,212,255,0.2)', border: '1px solid rgba(0,212,255,0.4)', borderRadius: 4, color: '#00d4ff', cursor: 'pointer', fontSize: 11, padding: '1px 8px' }}>继续</button>
                      <button onClick={() => { askContinueResolver(false); setAskContinueResolver(null) }}
                        style={{ background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.35)', borderRadius: 4, color: '#ff6b6b', cursor: 'pointer', fontSize: 11, padding: '1px 8px' }}>停止</button>
                    </span>
                  )}
                </span>
              </div>
            ))}

            {!msg.done && (
              <div style={{ color: '#6677aa', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ display: 'inline-block', animation: 'vspin 1s linear infinite' }}>⟳</span>
                <span>执行中…</span>
              </div>
            )}

            {msg.summary && (
              <div style={{
                marginTop: msg.steps.length > 0 ? 8 : 0,
                paddingTop: msg.steps.length > 0 ? 8 : 0,
                borderTop: msg.steps.length > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                fontSize: 13,
                color: '#e0e8ff',
                fontWeight: 500,
                lineHeight: 1.6,
              }}>
                {msg.summary}
              </div>
            )}
          </div>
        </div>
      )
    )
  }
}
