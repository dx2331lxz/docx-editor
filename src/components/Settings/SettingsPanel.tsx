import React, { useState, useEffect } from 'react'
import { Settings, X, Bot, HardDrive, Palette, Keyboard, ChevronRight, ChevronDown, Loader2 } from 'lucide-react'
import AISettingsContent from './AISettingsContent'
import { applyTheme, loadTheme } from '../AppTheme/AppThemeDialog'
import type { ThemeConfig } from '../AppTheme/AppThemeDialog'

type TabId = 'ai' | 'storage' | 'appearance' | 'shortcuts'

interface Tab {
  id: TabId
  icon: React.ReactNode
  label: string
}

const TABS: Tab[] = [
  { id: 'ai', icon: <Bot size={16} />, label: 'AI 配置' },
  { id: 'storage', icon: <HardDrive size={16} />, label: '存储' },
  { id: 'appearance', icon: <Palette size={16} />, label: '外观' },
  { id: 'shortcuts', icon: <Keyboard size={16} />, label: '快捷键' },
]

interface Props {
  defaultTab?: TabId
  currentFileId?: string | null
}

export default function SettingsPanel({ defaultTab = 'ai', currentFileId }: Props) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <>
      {/* Fixed settings button — bottom left */}
      <button
        onClick={() => setOpen(true)}
        title="设置"
        style={{
          position: 'fixed',
          bottom: 40,
          left: 16,
          zIndex: 500,
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'rgba(30,41,59,0.85)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(8px)',
          transition: 'transform 0.15s, background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(51,65,85,0.95)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(30,41,59,0.85)')}
      >
        <Settings size={16} />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
            zIndex: 900, backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 520,
          zIndex: 901,
          background: '#fff',
          boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={18} style={{ color: '#4b5563' }} />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' }}>设置</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4, borderRadius: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left nav tabs */}
          <nav style={{
            width: 140,
            borderRight: '1px solid #e5e7eb',
            padding: '8px 0',
            flexShrink: 0,
            background: '#f8fafc',
          }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  border: 'none',
                  background: activeTab === tab.id ? '#eff6ff' : 'transparent',
                  color: activeTab === tab.id ? '#2563eb' : '#374151',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  borderRight: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
              >
                {tab.icon}
                <span style={{ flex: 1 }}>{tab.label}</span>
                {activeTab === tab.id && <ChevronRight size={12} />}
              </button>
            ))}
          </nav>

          {/* Right content */}
          <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
            {activeTab === 'ai' && <AISettingsContent />}
            {activeTab === 'storage' && <StorageTab currentFileId={currentFileId} />}
            {activeTab === 'appearance' && <AppearanceTab />}
            {activeTab === 'shortcuts' && <ComingSoonTab label="快捷键" />}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Quark binding panel ────────────────────────────────────────────────────────

const API_BASE = ''  // 使用相对路径，兼容任意域名/端口访问

interface QuarkConfig {
  hasCookie: boolean
  cookiePreview?: string
  folderId?: string
  folderName?: string
}

interface QuarkFolder {
  fid: string
  name: string
}

function QuarkBindingPanel({ onBound }: { onBound: () => void }) {
  const [cookie, setCookie] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'idle' | 'ok' | 'fail'>('idle')
  const [folders, setFolders] = useState<QuarkFolder[]>([])
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState('0')
  const [selectedFolderName, setSelectedFolderName] = useState('根目录')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  async function handleTest() {
    setTesting(true)
    setTestResult('idle')
    setFolders([])
    try {
      const r = await fetch(`${API_BASE}/api/cloud/quark/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie }),
      })
      const d = await r.json()
      if (d.valid) {
        setTestResult('ok')
        setLoadingFolders(true)
        try {
          // Save cookie temporarily so /api/cloud/quark/folders can use it
          await fetch(`${API_BASE}/api/cloud/quark/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cookie, folderId: '0', folderName: '根目录' }),
          })
          const fr = await fetch(`${API_BASE}/api/cloud/quark/folders`)
          const fd = await fr.json()
          setFolders(fd.folders || [])
        } finally { setLoadingFolders(false) }
      } else {
        setTestResult('fail')
      }
    } catch { setTestResult('fail') }
    finally { setTesting(false) }
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    try {
      const r = await fetch(`${API_BASE}/api/cloud/quark/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie, folderId: selectedFolderId, folderName: selectedFolderName }),
      })
      if (r.ok) { onBound() }
      else { setSaveError('保存失败，请重试') }
    } catch { setSaveError('保存失败，请重试') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ marginTop: 12, padding: 14, background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 8 }}>
      <div style={{ fontSize: 12, color: '#374151', marginBottom: 6, fontWeight: 500 }}>
        粘贴夸克网盘 Cookie
      </div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
        打开 pan.quark.cn → 按 F12 → Network → 任意请求 → 复制 Cookie 请求头
      </div>
      <textarea
        value={cookie}
        onChange={e => { setCookie(e.target.value); setTestResult('idle') }}
        rows={3}
        placeholder="kps=xxx; kpf=xxx; ..."
        style={{
          width: '100%', boxSizing: 'border-box', padding: '8px 10px',
          border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11,
          fontFamily: 'monospace', resize: 'vertical', color: '#1e293b',
          outline: 'none',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <button
          onClick={handleTest}
          disabled={testing || !cookie.trim()}
          style={{
            padding: '5px 12px', background: '#2563eb', color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 12, cursor: testing || !cookie.trim() ? 'not-allowed' : 'pointer',
            opacity: testing || !cookie.trim() ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          {testing && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
          测试连接
        </button>
        {testResult === 'ok' && <span style={{ fontSize: 12, color: '#16a34a' }}>✅ 连接成功</span>}
        {testResult === 'fail' && <span style={{ fontSize: 12, color: '#dc2626' }}>❌ Cookie 无效或已过期</span>}
      </div>

      {testResult === 'ok' && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>选择同步目标文件夹</div>
          {loadingFolders ? (
            <div style={{ fontSize: 12, color: '#9ca3af' }}>加载文件夹列表...</div>
          ) : (
            <select
              value={selectedFolderId}
              onChange={e => {
                const opt = e.target.options[e.target.selectedIndex]
                setSelectedFolderId(e.target.value)
                setSelectedFolderName(opt.text)
              }}
              style={{
                padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6,
                fontSize: 12, background: '#fff', color: '#1e293b', width: '100%',
              }}
            >
              <option value="0">根目录</option>
              {folders.map(f => (
                <option key={f.fid} value={f.fid}>{f.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {testResult === 'ok' && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '6px 16px', background: '#fa6400', color: '#fff',
              border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {saving && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
            保存绑定
          </button>
          {saveError && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>{saveError}</div>}
        </div>
      )}
    </div>
  )
}

function QuarkBoundCard({
  config, currentFileId, onUnbind,
}: { config: QuarkConfig; currentFileId?: string | null; onUnbind: () => void }) {
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  async function handleSync() {
    if (!currentFileId) { setSyncMsg('请先打开一个文档'); return }
    setSyncing(true)
    setSyncMsg('')
    try {
      const r = await fetch(`${API_BASE}/api/cloud/quark/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: currentFileId }),
      })
      const d = await r.json()
      setSyncMsg(d.success ? `✅ ${d.message || '同步成功'}` : `❌ ${d.message || '同步失败'}`)
    } catch { setSyncMsg('❌ 同步请求失败') }
    finally { setSyncing(false) }
  }

  return (
    <div style={{ marginTop: 12, padding: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#15803d', marginBottom: 4 }}>
        ✅ 已绑定夸克网盘
      </div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>
        Cookie: <span style={{ fontFamily: 'monospace' }}>{config.cookiePreview}</span>
      </div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>
        同步目录：{config.folderName || '根目录'}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={handleSync}
          disabled={syncing || !currentFileId}
          title={!currentFileId ? '请先打开一个文档' : ''}
          style={{
            padding: '5px 12px', background: '#fa6400', color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500,
            cursor: syncing || !currentFileId ? 'not-allowed' : 'pointer',
            opacity: syncing || !currentFileId ? 0.6 : 1,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          {syncing && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
          ⬆ 立即同步当前文档
        </button>
        <button
          onClick={onUnbind}
          style={{
            padding: '5px 12px', background: '#f1f5f9', color: '#64748b',
            border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, cursor: 'pointer',
          }}
        >
          解除绑定
        </button>
      </div>
      {syncMsg && <div style={{ fontSize: 12, marginTop: 8, color: syncMsg.startsWith('✅') ? '#15803d' : '#dc2626' }}>{syncMsg}</div>}
    </div>
  )
}

// ── Storage tab ───────────────────────────────────────────────────────────────

const CLOUD_PROVIDERS = [
  {
    id: 'baidu',
    name: '百度网盘',
    icon: '☁️',
    desc: '绑定百度网盘账号，自动同步文档到云端',
    color: '#2468f2',
    comingSoon: true,
  },
  {
    id: 'aliyun',
    name: '阿里云盘',
    icon: '🗂️',
    desc: '绑定阿里云盘，文档实时同步',
    color: '#ff6a00',
    comingSoon: true,
  },
  {
    id: 'webdav',
    name: 'WebDAV',
    icon: '🔗',
    desc: '自定义 WebDAV 服务器（坚果云、Nextcloud 等）',
    color: '#6366f1',
    comingSoon: true,
  },
]

function StorageTab({ currentFileId }: { currentFileId?: string | null }) {
  const [quarkConfig, setQuarkConfig] = useState<QuarkConfig | null>(null)
  const [quarkExpanded, setQuarkExpanded] = useState(false)
  const [loadingConfig, setLoadingConfig] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/cloud/quark/config`)
      .then(r => r.json())
      .then(d => setQuarkConfig(d))
      .catch(() => setQuarkConfig({ hasCookie: false }))
      .finally(() => setLoadingConfig(false))
  }, [])

  async function handleUnbind() {
    await fetch(`${API_BASE}/api/cloud/quark/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookie: '', folderId: '0', folderName: '根目录' }),
    })
    setQuarkConfig({ hasCookie: false })
    setQuarkExpanded(false)
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>云端存储</h3>
      <p style={{ margin: '0 0 20px', fontSize: 12, color: '#6b7280' }}>
        文档默认保存在本地服务器。绑定云端存储后可实现跨设备同步与备份。
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Quark */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
            <span style={{ fontSize: 24 }}>⚡</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>夸克网盘</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>绑定夸克网盘账号，支持自动备份</div>
            </div>
            {loadingConfig ? (
              <Loader2 size={14} style={{ color: '#9ca3af', animation: 'spin 1s linear infinite' }} />
            ) : quarkConfig?.hasCookie ? (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#dcfce7', color: '#16a34a', fontWeight: 500 }}>已绑定</span>
            ) : (
              <button
                onClick={() => setQuarkExpanded(v => !v)}
                style={{
                  padding: '5px 14px', background: '#fa6400', color: '#fff',
                  border: 'none', borderRadius: 6, cursor: 'pointer',
                  fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                绑定
                <ChevronDown size={12} style={{ transform: quarkExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
            )}
          </div>
          {(quarkExpanded || quarkConfig?.hasCookie) && (
            <div style={{ padding: '0 14px 14px' }}>
              {quarkConfig?.hasCookie ? (
                <QuarkBoundCard config={quarkConfig} currentFileId={currentFileId} onUnbind={handleUnbind} />
              ) : (
                <QuarkBindingPanel onBound={() => {
                  fetch(`${API_BASE}/api/cloud/quark/config`)
                    .then(r => r.json())
                    .then(d => { setQuarkConfig(d); setQuarkExpanded(false) })
                    .catch(() => { })
                }} />
              )}
            </div>
          )}
        </div>

        {/* Other providers (coming soon) */}
        {CLOUD_PROVIDERS.map(p => (
          <div
            key={p.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: '#fff',
              opacity: 0.7,
            }}
          >
            <span style={{ fontSize: 24 }}>{p.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                {p.name}
                <span style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 10,
                  background: '#f1f5f9', color: '#94a3b8', fontWeight: 500,
                }}>即将推出</span>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{p.desc}</div>
            </div>
            <button
              disabled
              style={{
                padding: '5px 14px', background: '#f1f5f9', color: '#9ca3af',
                border: 'none', borderRadius: 6, cursor: 'not-allowed',
                fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
              }}
            >
              待接入
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Coming soon placeholder ───────────────────────────────────────────────────

function AppearanceTab() {
  const [config, setConfig] = useState<ThemeConfig>(loadTheme)

  function update(partial: Partial<ThemeConfig>) {
    const next = { ...config, ...partial }
    setConfig(next)
    applyTheme(next)
  }

  type ColorMode = ThemeConfig['mode']
  type AccentColor = ThemeConfig['accent']
  type AppSkin = ThemeConfig['skin']

  const ACCENT_COLORS: Record<AccentColor, { primary: string; light: string; label: string }> = {
    blue: { primary: '#2563eb', light: '#eff6ff', label: '蓝色' },
    green: { primary: '#16a34a', light: '#f0fdf4', label: '绿色' },
    purple: { primary: '#7c3aed', light: '#f5f3ff', label: '紫色' },
    orange: { primary: '#ea580c', light: '#fff7ed', label: '橙色' },
  }

  const APP_SKINS: Array<{ id: AppSkin; name: string; desc: string; toolbar: string; canvas: string; page: string; textOnToolbar: string }> = [
    { id: 'clean', name: '清爽白', desc: '简洁明亮', toolbar: '#ffffff', canvas: '#e2e8f0', page: '#ffffff', textOnToolbar: '#374151' },
    { id: 'glass', name: '玻璃暗色', desc: '科技质感', toolbar: '#0d1117', canvas: '#0a0e1a', page: '#ffffff', textOnToolbar: '#c8d8ff' },
    { id: 'slate', name: '商务灰', desc: '专业沉稳', toolbar: '#1e293b', canvas: '#cdd5df', page: '#ffffff', textOnToolbar: '#cbd5e1' },
    { id: 'warm', name: '暖阳', desc: '温暖舒适', toolbar: '#fffaf4', canvas: '#ede0ce', page: '#fffdf8', textOnToolbar: '#5c3d1e' },
    { id: 'night', name: '深夜护眼', desc: '护眼夜间', toolbar: '#1f2430', canvas: '#151820', page: '#f5f4f0', textOnToolbar: '#b0bcd0' },
  ]

  const MODE_OPTIONS: { value: ColorMode; label: string; icon: string }[] = [
    { value: 'light', label: '浅色', icon: '☀️' },
    { value: 'dark', label: '深色', icon: '🌙' },
    { value: 'system', label: '跟随系统', icon: '💻' },
  ]

  const accent = ACCENT_COLORS[config.accent]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Skin */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>外观皮肤</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {APP_SKINS.map(skin => {
            const isActive = config.skin === skin.id
            return (
              <button
                key={skin.id}
                onClick={() => update({ skin: skin.id })}
                style={{
                  border: `2px solid ${isActive ? accent.primary : '#e5e7eb'}`,
                  borderRadius: 8, padding: 0, cursor: 'pointer', background: 'transparent',
                  overflow: 'hidden', transition: 'border-color 0.15s',
                  boxShadow: isActive ? `0 0 0 1px ${accent.primary}` : 'none',
                }}
              >
                <div style={{ background: skin.canvas, padding: '6px 6px 4px' }}>
                  <div style={{ background: skin.toolbar, borderRadius: '4px 4px 0 0', padding: '3px 4px', display: 'flex', gap: 2 }}>
                    {[1, 2, 3].map(i => <div key={i} style={{ width: 8, height: 4, background: skin.textOnToolbar, borderRadius: 1, opacity: 0.6 }} />)}
                  </div>
                  <div style={{ background: skin.page, height: 30, borderRadius: '0 0 2px 2px', padding: '3px 4px' }}>
                    {[1, 2, 3].map(i => <div key={i} style={{ height: 3, background: '#d1d5db', borderRadius: 1, marginBottom: 2, width: i === 3 ? '60%' : '100%' }} />)}
                  </div>
                </div>
                <div style={{ padding: '4px 4px 5px', background: '#fff' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#1f2937', marginBottom: 1 }}>{skin.name}</div>
                  <div style={{ fontSize: 9, color: '#9ca3af' }}>{skin.desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Mode */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>显示模式</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {MODE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => update({ mode: opt.value })}
              style={{
                flex: 1, padding: '12px 8px', border: `2px solid ${config.mode === opt.value ? accent.primary : '#e5e7eb'}`,
                borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                background: config.mode === opt.value ? accent.light : '#fff',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 4 }}>{opt.icon}</div>
              <div style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>{opt.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Accent */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>主题色</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {(Object.entries(ACCENT_COLORS) as [AccentColor, typeof ACCENT_COLORS[AccentColor]][]).map(([key, val]) => (
            <button
              key={key}
              onClick={() => update({ accent: key })}
              title={val.label}
              style={{
                width: 32, height: 32, background: val.primary,
                border: `3px solid ${config.accent === key ? '#1f2937' : 'transparent'}`,
                borderRadius: '50%', cursor: 'pointer', position: 'relative',
                outline: 'none', transition: 'border 0.15s', flexShrink: 0,
              }}
            >
              {config.accent === key && (
                <span style={{ color: '#fff', fontSize: 14, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>✓</span>
              )}
            </button>
          ))}
          <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>{accent.label}</span>
        </div>
      </div>

      {/* Reset */}
      <div>
        <button
          onClick={() => update({ mode: 'light', accent: 'blue', skin: 'clean' })}
          style={{ padding: '6px 14px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#6b7280' }}
        >
          重置默认
        </button>
      </div>
    </div>
  )
}

function ComingSoonTab({ label }: { label: string }) {
  return (
    <div style={{ textAlign: 'center', paddingTop: 60, color: '#9ca3af' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🚧</div>
      <div style={{ fontSize: 15, fontWeight: 500, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 12, marginTop: 6 }}>即将推出</div>
    </div>
  )
}
