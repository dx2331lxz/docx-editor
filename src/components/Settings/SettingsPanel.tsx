import React, { useState, useEffect } from 'react'
import { Settings, X, Bot, HardDrive, Palette, Keyboard, ChevronRight } from 'lucide-react'
import AISettingsContent from './AISettingsContent'

type TabId = 'ai' | 'storage' | 'appearance' | 'shortcuts'

interface Tab {
  id: TabId
  icon: React.ReactNode
  label: string
}

const TABS: Tab[] = [
  { id: 'ai',         icon: <Bot size={16} />,      label: 'AI 配置' },
  { id: 'storage',    icon: <HardDrive size={16} />, label: '存储' },
  { id: 'appearance', icon: <Palette size={16} />,   label: '外观' },
  { id: 'shortcuts',  icon: <Keyboard size={16} />,  label: '快捷键' },
]

interface Props {
  defaultTab?: TabId
}

export default function SettingsPanel({ defaultTab = 'ai' }: Props) {
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
          bottom: 16,
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
            {activeTab === 'storage' && <StorageTab />}
            {activeTab === 'appearance' && <ComingSoonTab label="外观" />}
            {activeTab === 'shortcuts' && <ComingSoonTab label="快捷键" />}
          </div>
        </div>
      </div>
    </>
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
    id: 'quark',
    name: '夸克网盘',
    icon: '⚡',
    desc: '绑定夸克网盘账号，支持自动备份',
    color: '#fa6400',
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

function StorageTab() {
  return (
    <div>
      <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>云端存储</h3>
      <p style={{ margin: '0 0 20px', fontSize: 12, color: '#6b7280' }}>
        文档默认保存在本地服务器。绑定云端存储后可实现跨设备同步与备份。
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {CLOUD_PROVIDERS.map(p => (
          <div
            key={p.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: '#fff',
              opacity: p.comingSoon ? 0.7 : 1,
            }}
          >
            <span style={{ fontSize: 24 }}>{p.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                {p.name}
                {p.comingSoon && (
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 10,
                    background: '#f1f5f9', color: '#94a3b8', fontWeight: 500,
                  }}>即将推出</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{p.desc}</div>
            </div>
            <button
              disabled={p.comingSoon}
              style={{
                padding: '5px 14px',
                background: p.comingSoon ? '#f1f5f9' : p.color,
                color: p.comingSoon ? '#9ca3af' : '#fff',
                border: 'none', borderRadius: 6,
                cursor: p.comingSoon ? 'not-allowed' : 'pointer',
                fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
              }}
            >
              {p.comingSoon ? '待接入' : '绑定'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Coming soon placeholder ───────────────────────────────────────────────────

function ComingSoonTab({ label }: { label: string }) {
  return (
    <div style={{ textAlign: 'center', paddingTop: 60, color: '#9ca3af' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🚧</div>
      <div style={{ fontSize: 15, fontWeight: 500, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 12, marginTop: 6 }}>即将推出</div>
    </div>
  )
}
