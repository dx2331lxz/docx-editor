import { useState, useEffect } from 'react'
import { Editor } from '@tiptap/react'

export type PasteMode = 'keepSource' | 'matchStyle' | 'plainText'

export interface PasteConfig {
  defaultMode: PasteMode
  cleanWordTags: boolean
  cleanWebStyles: boolean
  smartQuotes: boolean
}

export const DEFAULT_PASTE_CONFIG: PasteConfig = {
  defaultMode: 'matchStyle',
  cleanWordTags: true,
  cleanWebStyles: true,
  smartQuotes: true,
}

const STORAGE_KEY = 'docx-editor-paste-config'

export function loadPasteConfig(): PasteConfig {
  try {
    return { ...DEFAULT_PASTE_CONFIG, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  } catch {
    return DEFAULT_PASTE_CONFIG
  }
}

export function savePasteConfig(cfg: PasteConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

// Paste picker overlay (Ctrl+Shift+V)
export function PastePicker({
  editor,
  onClose,
  clipboardHtml,
}: {
  editor: Editor | null
  onClose: () => void
  clipboardHtml?: string
}) {
  const cfg = loadPasteConfig()

  function applyPaste(mode: PasteMode) {
    if (!editor || !clipboardHtml) { onClose(); return }
    let content = clipboardHtml
    if (mode === 'plainText') {
      const tmp = document.createElement('div')
      tmp.innerHTML = content
      content = tmp.textContent || ''
      editor.chain().focus().insertContent(content).run()
    } else if (mode === 'matchStyle') {
      // Strip inline styles, keep structure
      content = content.replace(/\s*style="[^"]*"/gi, '')
      content = content.replace(/\s*class="[^"]*"/gi, '')
      if (cfg.cleanWordTags) {
        content = content.replace(/<\/?(o:|w:|m:)[^>]*>/gi, '')
        content = content.replace(/<!--[\s\S]*?-->/g, '')
      }
      editor.chain().focus().insertContent(content).run()
    } else {
      // keepSource
      editor.chain().focus().insertContent(content).run()
    }
    onClose()
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const options: { mode: PasteMode; label: string; desc: string; icon: string }[] = [
    { mode: 'keepSource', label: '保留源格式', desc: '保持原始文档的所有格式', icon: '📋' },
    { mode: 'matchStyle', label: '匹配当前样式', desc: '清除格式，套用当前文档样式', icon: '🎨' },
    { mode: 'plainText', label: '只保留文本', desc: '去除所有格式，纯文字粘贴', icon: '📝' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
    }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 20, width: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: '#1e293b' }}>选择粘贴方式</div>
        {options.map(opt => (
          <button
            key={opt.mode}
            onClick={() => applyPaste(opt.mode)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%',
              padding: '10px 12px', marginBottom: 6, border: `1px solid ${opt.mode === cfg.defaultMode ? '#3b82f6' : '#e5e7eb'}`,
              borderRadius: 8, cursor: 'pointer', background: opt.mode === cfg.defaultMode ? '#eff6ff' : '#fff',
              textAlign: 'left'
            }}
          >
            <span style={{ fontSize: 20 }}>{opt.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{opt.desc}</div>
            </div>
          </button>
        ))}
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>按 Esc 取消</div>
      </div>
    </div>
  )
}

interface Props {
  onClose: () => void
}

export default function PasteSettingsDialog({ onClose }: Props) {
  const [cfg, setCfg] = useState<PasteConfig>(loadPasteConfig)

  function update(partial: Partial<PasteConfig>) {
    setCfg(prev => ({ ...prev, ...partial }))
  }

  function save() {
    savePasteConfig(cfg)
    onClose()
  }

  const MODE_OPTIONS: { value: PasteMode; label: string; desc: string }[] = [
    { value: 'keepSource', label: '保留源格式', desc: '粘贴时完整保留原始格式' },
    { value: 'matchStyle', label: '匹配当前样式', desc: '自动套用文档当前段落样式' },
    { value: 'plainText', label: '纯文本', desc: '去除全部格式，只保留文字' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 10, width: 460, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#1e293b' }}>粘贴设置</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>默认粘贴方式</div>
            {MODE_OPTIONS.map(opt => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="pasteMode"
                  checked={cfg.defaultMode === opt.value}
                  onChange={() => update({ defaultMode: opt.value })}
                  style={{ marginTop: 2 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1f2937' }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>智能清理选项</div>
            {[
              { key: 'cleanWordTags' as const, label: '清理 Word 专有标签', desc: '去除 <o:p> 等 Office XML 标签' },
              { key: 'cleanWebStyles' as const, label: '清理网页内联样式', desc: '去除 style="" 和 class="" 属性' },
              { key: 'smartQuotes' as const, label: '智能引号转换', desc: '将直引号替换为弯引号' },
            ].map(item => (
              <label key={item.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={cfg[item.key]}
                  onChange={e => update({ [item.key]: e.target.checked })}
                  style={{ marginTop: 2 }}
                />
                <div>
                  <div style={{ fontSize: 13, color: '#1f2937' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{item.desc}</div>
                </div>
              </label>
            ))}
          </div>
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '8px 12px', marginTop: 12, fontSize: 12, color: '#0369a1' }}>
            💡 提示：粘贴时按 <kbd style={{ background: '#e0f2fe', padding: '1px 5px', borderRadius: 3, fontFamily: 'monospace' }}>Ctrl+Shift+V</kbd> 可打开粘贴方式选择器
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '6px 18px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>取消</button>
          <button onClick={save} style={{ padding: '6px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>保存设置</button>
        </div>
      </div>
    </div>
  )
}
