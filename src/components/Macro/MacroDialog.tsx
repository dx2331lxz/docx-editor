import { useState } from 'react'
import { Editor } from '@tiptap/react'

interface MacroStep {
  cmd: string
  params?: Record<string, unknown>
  label: string
}

interface Macro {
  id: string
  name: string
  steps: MacroStep[]
  createdAt: number
}

interface Props {
  editor: Editor | null
  onClose: () => void
}

const STORAGE_KEY = 'docx-editor-macros'

const AVAILABLE_COMMANDS: { cmd: string; label: string; params?: Record<string, unknown> }[] = [
  { cmd: 'toggleBold', label: '粗体' },
  { cmd: 'toggleItalic', label: '斜体' },
  { cmd: 'toggleUnderline', label: '下划线' },
  { cmd: 'toggleStrike', label: '删除线' },
  { cmd: 'setTextAlign', label: '左对齐', params: { alignment: 'left' } },
  { cmd: 'setTextAlign', label: '居中', params: { alignment: 'center' } },
  { cmd: 'setTextAlign', label: '右对齐', params: { alignment: 'right' } },
  { cmd: 'setTextAlign', label: '两端对齐', params: { alignment: 'justify' } },
  { cmd: 'unsetAllMarks', label: '清除所有格式' },
]

function loadMacros(): Macro[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveMacros(macros: Macro[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(macros))
}

export default function MacroDialog({ editor, onClose }: Props) {
  const [macros, setMacros] = useState<Macro[]>(loadMacros)
  const [recording, setRecording] = useState(false)
  const [recordedSteps, setRecordedSteps] = useState<MacroStep[]>([])
  const [newName, setNewName] = useState('')
  const [selectedMacroId, setSelectedMacroId] = useState<string | null>(null)
  const [tab, setTab] = useState<'list' | 'record'>('list')

  function addStep(cmd: typeof AVAILABLE_COMMANDS[0]) {
    setRecordedSteps(prev => [...prev, { cmd: cmd.cmd, params: cmd.params, label: cmd.label }])
  }

  function removeStep(idx: number) {
    setRecordedSteps(prev => prev.filter((_, i) => i !== idx))
  }

  function saveMacro() {
    if (!newName.trim() || recordedSteps.length === 0) return
    const macro: Macro = {
      id: Date.now().toString(),
      name: newName.trim(),
      steps: recordedSteps,
      createdAt: Date.now(),
    }
    setMacros(prev => {
      const updated = [...prev, macro]
      saveMacros(updated)
      return updated
    })
    setNewName('')
    setRecordedSteps([])
    setRecording(false)
    setTab('list')
  }

  function runMacro(macro: Macro) {
    if (!editor) return
    let chain = editor.chain().focus()
    for (const step of macro.steps) {
      const fn = (chain as unknown as Record<string, (p?: unknown) => typeof chain>)[step.cmd]
      if (typeof fn === 'function') {
        if (step.params && Object.keys(step.params).length > 0) {
          const firstParam = Object.values(step.params)[0]
          chain = fn.call(chain, firstParam) as typeof chain
        } else {
          chain = fn.call(chain) as typeof chain
        }
      }
    }
    chain.run()
  }

  function deleteMacro(id: string) {
    setMacros(prev => {
      const updated = prev.filter(m => m.id !== id)
      saveMacros(updated)
      return updated
    })
    if (selectedMacroId === id) setSelectedMacroId(null)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ background: '#fff', borderRadius: 8, width: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>宏</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
          {(['list', 'record'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 14, borderBottom: tab === t ? '2px solid #2563eb' : '2px solid transparent',
                color: tab === t ? '#2563eb' : '#6b7280'
              }}
            >
              {t === 'list' ? '宏列表' : '录制宏'}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {tab === 'list' && (
            <>
              {macros.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>
                  暂无宏，切换到"录制宏"标签创建
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {macros.map(macro => (
                    <div
                      key={macro.id}
                      style={{
                        padding: '12px 16px', border: `1px solid ${selectedMacroId === macro.id ? '#2563eb' : '#e5e7eb'}`,
                        borderRadius: 6, cursor: 'pointer', background: selectedMacroId === macro.id ? '#eff6ff' : '#fff'
                      }}
                      onClick={() => setSelectedMacroId(macro.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{macro.name}</div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                            {macro.steps.map(s => s.label).join(' → ')}
                          </div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                            {new Date(macro.createdAt).toLocaleString('zh-CN')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={e => { e.stopPropagation(); runMacro(macro) }}
                            style={{ padding: '4px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                          >运行</button>
                          <button
                            onClick={e => { e.stopPropagation(); deleteMacro(macro.id) }}
                            style={{ padding: '4px 12px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                          >删除</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'record' && (
            <div style={{ display: 'flex', gap: 16 }}>
              {/* Commands panel */}
              <div style={{ width: 200 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#374151' }}>可用操作</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {AVAILABLE_COMMANDS.map((cmd, i) => (
                    <button
                      key={i}
                      onClick={() => { setRecording(true); addStep(cmd) }}
                      style={{
                        padding: '6px 10px', background: '#f3f4f6', border: '1px solid #e5e7eb',
                        borderRadius: 4, cursor: 'pointer', textAlign: 'left', fontSize: 13
                      }}
                    >
                      + {cmd.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Steps panel */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#374151' }}>
                  录制步骤 {recording && <span style={{ color: '#dc2626', fontSize: 11 }}>● 录制中</span>}
                </div>

                {recordedSteps.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13, border: '1px dashed #d1d5db', borderRadius: 6 }}>
                    点击左侧操作添加步骤
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                    {recordedSteps.map((step, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#f9fafb', borderRadius: 4, border: '1px solid #e5e7eb' }}>
                        <span style={{ fontSize: 11, color: '#9ca3af', minWidth: 20 }}>{i + 1}.</span>
                        <span style={{ flex: 1, fontSize: 13 }}>{step.label}</span>
                        <button onClick={() => removeStep(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="输入宏名称"
                    style={{ flex: 1, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}
                  />
                  <button
                    onClick={saveMacro}
                    disabled={!newName.trim() || recordedSteps.length === 0}
                    style={{
                      padding: '6px 16px', background: newName.trim() && recordedSteps.length > 0 ? '#2563eb' : '#9ca3af',
                      color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13
                    }}
                  >
                    保存宏
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', textAlign: 'right' }}>
          <button onClick={onClose} style={{ padding: '6px 20px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 4, cursor: 'pointer' }}>关闭</button>
        </div>
      </div>
    </div>
  )
}
