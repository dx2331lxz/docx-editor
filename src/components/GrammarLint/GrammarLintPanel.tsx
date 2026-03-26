import { useState, useCallback } from 'react'
import { Editor } from '@tiptap/react'

interface LintIssue {
  id: string
  type: 'dupPunct' | 'mixedWidth' | 'extraSpace' | 'trailingSpace' | 'cnCommaEn'
  message: string
  original: string
  suggestion: string
  position: number
  context: string
}

interface Props {
  editor: Editor | null
  onClose: () => void
}

function lintText(text: string): LintIssue[] {
  const issues: LintIssue[] = []
  let id = 0

  const CHECKS: { type: LintIssue['type']; regex: RegExp; message: string; fix: (m: string) => string }[] = [
    {
      type: 'dupPunct',
      regex: /([。！？，、；：…]{2,})/g,
      message: '重复标点符号',
      fix: m => m[0],
    },
    {
      type: 'extraSpace',
      regex: /([。！？，、；：])(\s{2,})/g,
      message: '标点后多余空格',
      fix: m => m.replace(/\s{2,}/, ' '),
    },
    {
      type: 'trailingSpace',
      regex: /[ \t]{2,}/g,
      message: '多余连续空格',
      fix: () => ' ',
    },
    {
      type: 'mixedWidth',
      regex: /([a-zA-Z0-9])([，。！？；：])/g,
      message: '英文后接中文标点',
      fix: m => m.replace(/[，。！？；：]/, match => ({
        '，': ',', '。': '.', '！': '!', '？': '?', '；': ';', '：': ':'
      }[match] || match)),
    },
    {
      type: 'cnCommaEn',
      regex: /([。！？，])([A-Z])/g,
      message: '中文标点后接大写英文字母（可能需要换行）',
      fix: m => m,
    },
  ]

  for (const check of CHECKS) {
    check.regex.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = check.regex.exec(text)) !== null) {
      const start = Math.max(0, m.index - 15)
      const end = Math.min(text.length, m.index + m[0].length + 15)
      issues.push({
        id: String(++id),
        type: check.type,
        message: check.message,
        original: m[0],
        suggestion: check.fix(m[0]),
        position: m.index,
        context: `...${text.slice(start, m.index)}<mark>${m[0]}</mark>${text.slice(m.index + m[0].length, end)}...`,
      })
      if (issues.length >= 50) break
    }
    if (issues.length >= 50) break
  }

  return issues
}

const TYPE_LABELS: Record<LintIssue['type'], { label: string; color: string; bg: string }> = {
  dupPunct:    { label: '重复标点', color: '#dc2626', bg: '#fee2e2' },
  mixedWidth:  { label: '标点混用', color: '#d97706', bg: '#fef3c7' },
  extraSpace:  { label: '多余空格', color: '#7c3aed', bg: '#ede9fe' },
  trailingSpace: { label: '连续空格', color: '#6b7280', bg: '#f3f4f6' },
  cnCommaEn:   { label: '标点警告', color: '#0369a1', bg: '#e0f2fe' },
}

export default function GrammarLintPanel({ editor, onClose }: Props) {
  const [issues, setIssues] = useState<LintIssue[]>([])
  const [scanned, setScanned] = useState(false)
  const [fixed, setFixed] = useState<Set<string>>(new Set())

  const scan = useCallback(() => {
    if (!editor) return
    const text = editor.state.doc.textContent
    const found = lintText(text)
    setIssues(found)
    setScanned(true)
    setFixed(new Set())
  }, [editor])

  function fixIssue(issue: LintIssue) {
    if (!editor) return
    const html = editor.getHTML()
    const escaped = issue.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const replaced = html.replace(new RegExp(escaped, ''), issue.suggestion)
    if (replaced !== html) {
      editor.commands.setContent(replaced)
      setFixed(prev => new Set([...prev, issue.id]))
    }
  }

  function fixAll() {
    if (!editor) return
    let html = editor.getHTML()
    for (const issue of issues) {
      if (issue.suggestion !== issue.original) {
        const escaped = issue.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        html = html.replace(new RegExp(escaped, 'g'), issue.suggestion)
      }
    }
    editor.commands.setContent(html)
    setFixed(new Set(issues.map(i => i.id)))
  }

  const unfixedCount = issues.filter(i => !fixed.has(i.id)).length
  const typeGroups = Array.from(new Set(issues.map(i => i.type)))

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 10, width: 580, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#1e293b' }}>✍️ 语法检查</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        <div style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={scan}
            style={{ padding: '7px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            🔍 开始扫描
          </button>
          {scanned && unfixedCount > 0 && (
            <button onClick={fixAll}
              style={{ padding: '7px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
              ✅ 一键修复全部 ({unfixedCount})
            </button>
          )}
          {scanned && (
            <span style={{ fontSize: 12, color: issues.length === 0 ? '#16a34a' : '#dc2626', marginLeft: 'auto' }}>
              {issues.length === 0 ? '✓ 未发现问题' : `发现 ${issues.length} 个问题${fixed.size > 0 ? `，已修复 ${fixed.size} 个` : ''}`}
            </span>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {!scanned && (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>✍️</div>
              <div>点击"开始扫描"检测文档中的常见错误</div>
              <div style={{ fontSize: 11, marginTop: 8 }}>检测：重复标点、全半角混用、多余空格等</div>
            </div>
          )}

          {scanned && issues.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#16a34a' }}>文档质量良好</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>未发现常见语法问题</div>
            </div>
          )}

          {issues.length > 0 && (
            <div>
              {/* Type summary */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {typeGroups.map(type => {
                  const info = TYPE_LABELS[type]
                  const count = issues.filter(i => i.type === type).length
                  return (
                    <span key={type} style={{ padding: '2px 10px', background: info.bg, color: info.color, borderRadius: 12, fontSize: 11, fontWeight: 500 }}>
                      {info.label} ×{count}
                    </span>
                  )
                })}
              </div>

              {/* Issue list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {issues.map(issue => {
                  const info = TYPE_LABELS[issue.type]
                  const isFixed = fixed.has(issue.id)
                  return (
                    <div key={issue.id} style={{
                      border: `1px solid ${isFixed ? '#d1fae5' : '#e5e7eb'}`,
                      borderRadius: 8, padding: '10px 14px',
                      background: isFixed ? '#f0fdf4' : '#fff',
                      opacity: isFixed ? 0.7 : 1,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ padding: '1px 7px', background: info.bg, color: info.color, borderRadius: 10, fontSize: 10, fontWeight: 600 }}>{info.label}</span>
                            <span style={{ fontSize: 12, color: '#374151' }}>{issue.message}</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#6b7280' }} dangerouslySetInnerHTML={{ __html: issue.context }} />
                          {issue.suggestion !== issue.original && (
                            <div style={{ fontSize: 11, marginTop: 4, color: '#16a34a' }}>
                              建议改为：<code style={{ background: '#dcfce7', padding: '0 4px', borderRadius: 3 }}>{issue.suggestion}</code>
                            </div>
                          )}
                        </div>
                        {isFixed ? (
                          <span style={{ fontSize: 12, color: '#16a34a', flexShrink: 0 }}>✓ 已修复</span>
                        ) : issue.suggestion !== issue.original ? (
                          <button onClick={() => fixIssue(issue)}
                            style={{ padding: '4px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, flexShrink: 0 }}>
                            修复
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '10px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '6px 20px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>关闭</button>
        </div>
      </div>
    </div>
  )
}
