import React, { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { runVibeEditing } from '../../lib/vibeEditingEngine'
import type { ProgressCallback } from '../../lib/vibeEditingEngine'

interface Props {
  editor: Editor | null
  onClose: () => void
}

type LogEntry = {
  id: number
  type: 'thinking' | 'action' | 'observation' | 'done' | 'error'
  text: string
}

const MAX_STEPS = 15

const PRESETS = [
  { label: '🏛️ 正式公文风格', value: '将这篇文章改写为正式公文风格：使用规范的公文标题格式，段落缩进两字符，措辞正式严谨，去除口语化表达，标题层级规范化（主标题用 h1，小标题用 h2/h3）' },
  { label: '🍎 苹果简约风', value: '按照苹果风格重新排版：大标题简洁有力，段落简短（每段不超过3句），增加空白感，去除冗余文字，关键词加粗，整体简洁现代' },
  { label: '📚 学术论文格式', value: '将文档改为学术论文格式：调用 summarize_document 生成摘要插入开头，正文分为引言、方法、结果、讨论、结论五个章节，语言学术严谨，normalize_headings 规范标题层级' },
  { label: '💼 商业报告风格', value: '转换为商业报告格式：添加执行摘要，正文用要点列表展示，数据用表格呈现，结论和建议单独成节，apply_document_theme business 应用商务主题' },
  { label: '🧹 一键清理格式', value: '清理文档中所有多余格式：remove_extra_spaces 清空格，remove_extra_blank_lines 清空行，normalize_headings 规范标题，整体排版整洁统一' },
  { label: '🎨 添加彩色主题', value: '为文档应用彩色活力主题：apply_document_theme colorful，apply_heading_style background，format_all_tables colorful，让文档充满色彩活力' },
  { label: '📑 规范标题层级', value: '规范文档所有标题的层级结构：normalize_headings 确保 h1/h2/h3 层级正确，apply_heading_style bordered 添加左边框强调，让文档结构清晰' },
  { label: '💧 添加公司水印', value: '为文档添加水印：add_watermark 文字为"机密文件"，透明度 0.08，同时 apply_document_theme business 应用商务风格' },
]

const TOOL_CATEGORIES = [
  { title: '文字格式', tools: 'set_font_size / set_font_family / set_text_color / set_font_bold / set_line_height / set_letter_spacing' },
  { title: '段落布局', tools: 'set_text_align / set_paragraph_spacing / set_indent' },
  { title: '文档结构', tools: 'normalize_headings / set_page_margins / add_watermark' },
  { title: '样式主题', tools: 'apply_document_theme / apply_heading_style / set_document_font' },
  { title: '内容改写 (AI)', tools: 'convert_to_formal / convert_to_casual / summarize_document' },
  { title: '内容清理', tools: 'remove_extra_spaces / remove_extra_blank_lines / add_section_dividers' },
  { title: '表格美化', tools: 'format_all_tables (bordered/striped/minimal/colorful)' },
  { title: '高级操作', tools: 'highlight_keywords / remove_formatting / batch_replace' },
]

const ICON_MAP: Record<string, string> = {
  thinking: '🤔',
  action: '🔧',
  observation: '👁',
  done: '✅',
  error: '❌',
}

const COLOR_MAP: Record<string, string> = {
  thinking: '#8899bb',
  action: '#00d4ff',
  observation: '#a0b4d0',
  done: '#00ffcc',
  error: '#ff6b6b',
}

const HISTORY_KEY = 'vibe_editing_history'

function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

function saveHistory(instruction: string, history: string[]): string[] {
  const filtered = history.filter(h => h !== instruction)
  const next = [instruction, ...filtered].slice(0, 5)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  return next
}

export default function VibeEditingPanel({ editor, onClose }: Props) {
  const [instruction, setInstruction] = useState('')
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>(loadHistory)
  const [showTools, setShowTools] = useState(false)
  const logEndRef = useRef<HTMLDivElement>(null)
  const logIdRef = useRef(0)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const addLog = (entry: Omit<LogEntry, 'id'>) => {
    logIdRef.current++
    setLogs(prev => [...prev, { ...entry, id: logIdRef.current }])
  }

  const handleStart = async (text?: string) => {
    const inst = (text ?? instruction).trim()
    if (!editor || !inst || running) return
    setRunning(true)
    setLogs([])
    setResult(null)
    setStep(0)
    setHistory(prev => saveHistory(inst, prev))

    const onProgress: ProgressCallback = (s) => {
      addLog(s)
      if (s.type === 'action') setStep(prev => prev + 1)
    }

    try {
      const summary = await runVibeEditing(inst, editor, onProgress)
      setResult(summary)
    } catch (err) {
      addLog({ type: 'error', text: String(err) })
      setResult('编辑过程出现错误，请重试。')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: 380,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(10, 14, 30, 0.97)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderLeft: '1px solid rgba(178, 75, 255, 0.35)',
      boxShadow: '-8px 0 40px rgba(0, 0, 0, 0.5), -2px 0 0 rgba(0, 212, 255, 0.08)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 18px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(178,75,255,0.08))',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#e0e8ff', letterSpacing: '0.3px' }}>
            ✨ Vibe Editing
          </div>
          <div style={{ fontSize: 11, color: '#8899bb', marginTop: 2 }}>
            AI 驱动的智能文档编辑 · 30+ 工具
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#8899bb',
            cursor: 'pointer',
            fontSize: 20,
            padding: '4px 6px',
            borderRadius: 6,
            lineHeight: 1,
          }}
        >✕</button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Instruction input */}
        <div>
          <label style={{ fontSize: 12, color: '#8899bb', display: 'block', marginBottom: 6 }}>
            描述你想要的效果
          </label>
          <textarea
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            disabled={running}
            placeholder="例如：把这篇文章改成正式公文风格，标题规范化，段落间距加大..."
            rows={4}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              color: '#e0e8ff',
              fontSize: 13,
              padding: '10px 12px',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              lineHeight: 1.5,
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleStart() } }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,212,255,0.12)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = 'none' }}
          />
        </div>

        {/* Preset buttons — 2 rows of 4 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => setInstruction(p.value)}
              disabled={running}
              style={{
                padding: '6px 10px',
                fontSize: 11,
                background: 'rgba(0,212,255,0.07)',
                border: '1px solid rgba(0,212,255,0.18)',
                borderRadius: 8,
                color: '#a8d4ff',
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'left',
                lineHeight: 1.3,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,212,255,0.16)'; e.currentTarget.style.borderColor = 'rgba(0,212,255,0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,212,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(0,212,255,0.18)' }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Start button */}
        <button
          onClick={() => handleStart()}
          disabled={running || !instruction.trim() || !editor}
          style={{
            width: '100%',
            padding: '11px',
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 8,
            border: running ? '1px solid rgba(178,75,255,0.3)' : '1px solid rgba(0,212,255,0.4)',
            background: running
              ? 'rgba(178,75,255,0.15)'
              : 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(178,75,255,0.2))',
            color: running ? '#a0b4d0' : '#e0e8ff',
            cursor: running ? 'not-allowed' : 'pointer',
            boxShadow: running ? 'none' : '0 0 16px rgba(0,212,255,0.2)',
            transition: 'all 0.2s',
            letterSpacing: '0.5px',
          }}
        >
          {running ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
              AI 编辑中… (步骤 {step}/{MAX_STEPS})
            </span>
          ) : '✨ 开始 Vibe Editing'}
        </button>

        {/* Progress bar */}
        {running && (
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', height: 4 }}>
            <div style={{
              height: '100%',
              width: `${Math.min(step * (100 / MAX_STEPS), 95)}%`,
              background: 'linear-gradient(90deg, #00d4ff, #b24bff)',
              borderRadius: 4,
              transition: 'width 0.4s ease',
            }} />
          </div>
        )}

        {/* History */}
        {history.length > 0 && !running && (
          <div>
            <div style={{ fontSize: 11, color: '#8899bb', marginBottom: 6 }}>🕐 最近使用</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {history.map((h, i) => (
                <button
                  key={i}
                  onClick={() => { setInstruction(h); handleStart(h) }}
                  style={{
                    padding: '5px 10px',
                    fontSize: 11,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 6,
                    color: '#8899bb',
                    cursor: 'pointer',
                    textAlign: 'left',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    transition: 'all 0.15s',
                  }}
                  title={h}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#c8d8ff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#8899bb' }}
                >
                  {h.slice(0, 60)}{h.length > 60 ? '…' : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Log area */}
        {logs.length > 0 && (
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8,
            padding: '10px 12px',
            maxHeight: 240,
            overflowY: 'auto',
            fontSize: 12,
            lineHeight: 1.6,
          }}>
            {logs.map(log => (
              <div key={log.id} style={{ color: COLOR_MAP[log.type] || '#c8d8ff', marginBottom: 4, wordBreak: 'break-all' }}>
                <span style={{ marginRight: 6 }}>{ICON_MAP[log.type] || '•'}</span>
                {log.text}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}

        {/* Result summary */}
        {result && !running && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,255,204,0.08), rgba(0,212,255,0.08))',
            border: '1px solid rgba(0,255,204,0.2)',
            borderRadius: 8,
            padding: '12px 14px',
            fontSize: 13,
            color: '#e0e8ff',
            lineHeight: 1.6,
          }}>
            <div style={{ color: '#00ffcc', fontWeight: 600, marginBottom: 6, fontSize: 12 }}>✅ 编辑完成</div>
            {result}
          </div>
        )}

        {/* Collapsible AI capabilities */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
          <button
            onClick={() => setShowTools(v => !v)}
            style={{
              background: 'none',
              border: 'none',
              color: '#6677aa',
              fontSize: 11,
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ transform: showTools ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▶</span>
            AI 能力列表（{TOOL_CATEGORIES.length} 类 30+ 工具）
          </button>
          {showTools && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {TOOL_CATEGORIES.map(cat => (
                <div key={cat.title} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 6,
                  padding: '6px 10px',
                }}>
                  <div style={{ fontSize: 11, color: '#00d4ff', fontWeight: 600, marginBottom: 3 }}>{cat.title}</div>
                  <div style={{ fontSize: 10, color: '#6677aa', lineHeight: 1.4 }}>{cat.tools}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Spin animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
