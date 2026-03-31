import { useState, useEffect } from 'react'

type ColorMode = 'light' | 'dark' | 'system'
type AccentColor = 'blue' | 'green' | 'purple' | 'orange'
type AppSkin = 'clean' | 'glass' | 'slate' | 'warm' | 'night'

interface ThemeConfig {
  mode: ColorMode
  accent: AccentColor
  skin: AppSkin
}

interface SkinDef {
  id: AppSkin
  name: string
  desc: string
  toolbar: string
  canvas: string
  page: string
  textOnToolbar: string
}

const APP_SKINS: SkinDef[] = [
  {
    id: 'clean',
    name: '清爽白',
    desc: '简洁明亮',
    toolbar: '#ffffff',
    canvas: '#e2e8f0',
    page: '#ffffff',
    textOnToolbar: '#374151',
  },
  {
    id: 'glass',
    name: '玻璃暗色',
    desc: '科技质感',
    toolbar: '#0d1117',
    canvas: '#0a0e1a',
    page: '#ffffff',
    textOnToolbar: '#c8d8ff',
  },
  {
    id: 'slate',
    name: '商务灰',
    desc: '专业沉稳',
    toolbar: '#1e293b',
    canvas: '#cdd5df',
    page: '#ffffff',
    textOnToolbar: '#cbd5e1',
  },
  {
    id: 'warm',
    name: '暖阳',
    desc: '温暖舒适',
    toolbar: '#fffaf4',
    canvas: '#ede0ce',
    page: '#fffdf8',
    textOnToolbar: '#5c3d1e',
  },
  {
    id: 'night',
    name: '深夜护眼',
    desc: '护眼夜间',
    toolbar: '#1f2430',
    canvas: '#151820',
    page: '#f5f4f0',
    textOnToolbar: '#b0bcd0',
  },
]

interface Props {
  onClose: () => void
}

const STORAGE_KEY = 'docx-editor-theme'

const ACCENT_COLORS: Record<AccentColor, { primary: string; light: string; label: string }> = {
  blue: { primary: '#2563eb', light: '#eff6ff', label: '蓝色' },
  green: { primary: '#16a34a', light: '#f0fdf4', label: '绿色' },
  purple: { primary: '#7c3aed', light: '#f5f3ff', label: '紫色' },
  orange: { primary: '#ea580c', light: '#fff7ed', label: '橙色' },
}

const DARK_CSS = `
[data-theme="dark"] {
  --bg-main: #1e1e2e;
  --bg-surface: #27273a;
  --bg-toolbar: #1f1f2e;
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --border-color: #374151;
  color-scheme: dark;
}
[data-theme="dark"] body,
[data-theme="dark"] .min-h-screen {
  background: var(--bg-main) !important;
  color: var(--text-primary) !important;
}
[data-theme="dark"] .bg-white {
  background: var(--bg-surface) !important;
  color: var(--text-primary) !important;
}
[data-theme="dark"] .bg-gray-100,
[data-theme="dark"] .bg-gray-50 {
  background: var(--bg-toolbar) !important;
}
[data-theme="dark"] .border-gray-200,
[data-theme="dark"] .border-gray-300 {
  border-color: var(--border-color) !important;
}
[data-theme="dark"] .text-gray-700,
[data-theme="dark"] .text-gray-600 {
  color: var(--text-primary) !important;
}
[data-theme="dark"] .text-gray-400,
[data-theme="dark"] .text-gray-500 {
  color: var(--text-secondary) !important;
}
[data-theme="dark"] .ProseMirror {
  background: #ffffff !important;
  color: #1f2937 !important;
}
[data-theme="dark"] select,
[data-theme="dark"] input[type="text"],
[data-theme="dark"] input[type="number"] {
  background: var(--bg-surface) !important;
  color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
}
[data-theme="dark"] button:not(.prose-btn) {
  color: var(--text-primary);
}
`

function loadTheme(): ThemeConfig {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    return { mode: 'light', accent: 'blue', skin: 'clean', ...saved }
  } catch {
    return { mode: 'light', accent: 'blue', skin: 'clean' }
  }
}

function applyTheme(config: ThemeConfig) {
  const root = document.documentElement
  const accent = ACCENT_COLORS[config.accent]

  // Apply accent CSS vars
  root.style.setProperty('--accent-primary', accent.primary)
  root.style.setProperty('--accent-light', accent.light)

  // Inject dark mode styles
  let styleEl = document.getElementById('docx-dark-theme')
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'docx-dark-theme'
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = DARK_CSS

  // Determine effective mode
  let isDark = false
  if (config.mode === 'dark') {
    isDark = true
  } else if (config.mode === 'system') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  root.setAttribute('data-theme', isDark ? 'dark' : 'light')

  // Apply skin
  document.body.dataset.skin = config.skin ?? 'clean'

  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

// Apply saved theme on module load
applyTheme(loadTheme())

export default function AppThemeDialog({ onClose }: Props) {
  const [config, setConfig] = useState<ThemeConfig>(loadTheme)

  useEffect(() => {
    applyTheme(config)
  }, [config])

  // Listen to system preference changes
  useEffect(() => {
    if (config.mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme(config)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [config])

  function update(partial: Partial<ThemeConfig>) {
    setConfig(prev => ({ ...prev, ...partial }))
  }

  const MODE_OPTIONS: { value: ColorMode; label: string; icon: string }[] = [
    { value: 'light', label: '浅色模式', icon: '☀️' },
    { value: 'dark', label: '深色模式', icon: '🌙' },
    { value: 'system', label: '跟随系统', icon: '💻' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ background: '#fff', borderRadius: 8, width: 520, overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>界面外观</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Skin selector */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>外观皮肤</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {APP_SKINS.map(skin => {
                const isActive = config.skin === skin.id
                return (
                  <button
                    key={skin.id}
                    onClick={() => update({ skin: skin.id })}
                    style={{
                      border: `2px solid ${isActive ? ACCENT_COLORS[config.accent].primary : '#e5e7eb'}`,
                      borderRadius: 8,
                      padding: 0,
                      cursor: 'pointer',
                      background: 'transparent',
                      overflow: 'hidden',
                      transition: 'border-color 0.15s',
                      boxShadow: isActive ? `0 0 0 1px ${ACCENT_COLORS[config.accent].primary}` : 'none',
                    }}
                  >
                    {/* Mini preview */}
                    <div style={{ background: skin.canvas, padding: '6px 6px 4px' }}>
                      {/* Toolbar strip */}
                      <div style={{
                        background: skin.toolbar,
                        borderRadius: '4px 4px 0 0',
                        padding: '3px 4px',
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                      }}>
                        {[1, 2, 3].map(i => (
                          <div key={i} style={{ width: 8, height: 4, background: skin.textOnToolbar, borderRadius: 1, opacity: 0.6 }} />
                        ))}
                      </div>
                      {/* Page */}
                      <div style={{
                        background: skin.page,
                        height: 36,
                        borderRadius: '0 0 2px 2px',
                        padding: '4px 5px',
                      }}>
                        {[1, 2, 3].map(i => (
                          <div key={i} style={{ height: 3, background: '#d1d5db', borderRadius: 1, marginBottom: 3, width: i === 3 ? '60%' : '100%' }} />
                        ))}
                      </div>
                    </div>
                    <div style={{ padding: '5px 4px 6px', background: '#fff' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#1f2937', marginBottom: 1 }}>{skin.name}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>{skin.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Color mode */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>外观模式</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {MODE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => update({ mode: opt.value })}
                  style={{
                    flex: 1, padding: '14px 8px', border: `2px solid ${config.mode === opt.value ? ACCENT_COLORS[config.accent].primary : '#e5e7eb'}`,
                    borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                    background: config.mode === opt.value ? ACCENT_COLORS[config.accent].light : '#fff',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{opt.icon}</div>
                  <div style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Accent color */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>主题色</div>
            <div style={{ display: 'flex', gap: 12 }}>
              {(Object.entries(ACCENT_COLORS) as [AccentColor, typeof ACCENT_COLORS[AccentColor]][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => update({ accent: key })}
                  title={val.label}
                  style={{
                    width: 44, height: 44, background: val.primary, border: `3px solid ${config.accent === key ? '#1f2937' : 'transparent'}`,
                    borderRadius: '50%', cursor: 'pointer', position: 'relative', outline: 'none', transition: 'border 0.15s'
                  }}
                >
                  {config.accent === key && (
                    <span style={{ color: '#fff', fontSize: 16, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              {(Object.keys(ACCENT_COLORS) as AccentColor[]).map(key => (
                <div key={key} style={{ width: 44, textAlign: 'center', fontSize: 11, color: '#6b7280' }}>{ACCENT_COLORS[key].label}</div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={() => { update({ mode: 'light', accent: 'blue', skin: 'clean' }) }}
            style={{ padding: '6px 16px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
          >重置</button>
          <button
            onClick={onClose}
            style={{ padding: '6px 20px', background: ACCENT_COLORS[config.accent].primary, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
          >完成</button>
        </div>
      </div>
    </div>
  )
}

export { applyTheme, loadTheme }
export type { ThemeConfig }
