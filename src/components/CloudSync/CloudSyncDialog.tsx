import { useState, useEffect } from 'react'

export type SyncStatus = 'synced' | 'syncing' | 'unsaved' | 'error' | 'offline'

export interface CloudSyncConfig {
  enabled: boolean
  provider: 'local' | 'mock' | 'none'
  autoSync: boolean
  syncIntervalMin: number
  docId: string
}

export const DEFAULT_CLOUD_SYNC: CloudSyncConfig = {
  enabled: false,
  provider: 'local',
  autoSync: true,
  syncIntervalMin: 5,
  docId: 'default',
}

const STORAGE_KEY = 'docx-editor-cloud-sync'
export const LOCAL_SERVER = ''  // 相对路径，兼容任意域名访问

export function loadCloudSyncConfig(): CloudSyncConfig {
  try { return { ...DEFAULT_CLOUD_SYNC, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } }
  catch { return DEFAULT_CLOUD_SYNC }
}

export function saveCloudSyncConfig(cfg: CloudSyncConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

/** Push document content to the local sync server */
export async function pushToLocalServer(docId: string, content: object, meta?: object): Promise<boolean> {
  try {
    const res = await fetch(`${LOCAL_SERVER}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId, content, meta }),
      signal: AbortSignal.timeout(5000),
    })
    return res.ok
  } catch { return false }
}

/** Check if local sync server is reachable */
export async function checkLocalServer(): Promise<boolean> {
  try {
    const res = await fetch(`${LOCAL_SERVER}/api/health`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch { return false }
}

// Status indicator component for StatusBar
export function CloudSyncIndicator({ status, lastSyncTime, onClick }: {
  status: SyncStatus
  lastSyncTime: Date | null
  onClick?: () => void
}) {
  const statusMap: Record<SyncStatus, { icon: string; label: string; color: string }> = {
    synced:  { icon: '✓', label: '已同步', color: '#86efac' },
    syncing: { icon: '⟳', label: '同步中…', color: '#fde68a' },
    unsaved: { icon: '●', label: '未保存', color: '#fca5a5' },
    error:   { icon: '✕', label: '同步失败', color: '#fca5a5' },
    offline: { icon: '—', label: '离线', color: '#d1d5db' },
  }
  const info = statusMap[status]
  return (
    <button
      onClick={onClick}
      title={`${info.label}${lastSyncTime ? ` · 上次同步：${lastSyncTime.toLocaleTimeString('zh-CN')}` : ''}`}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: info.color, fontSize: 11, display: 'flex', alignItems: 'center', gap: 3, padding: '0 4px' }}
    >
      <span>☁️{info.icon}</span>
      <span style={{ fontSize: 10 }}>{info.label}</span>
    </button>
  )
}

interface Props {
  onClose: () => void
  getContent?: () => object   // callback to get current editor content
}

export default function CloudSyncDialog({ onClose, getContent }: Props) {
  const [cfg, setCfg] = useState<CloudSyncConfig>(loadCloudSyncConfig)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [savedMsg, setSavedMsg] = useState(false)
  const [serverOnline, setServerOnline] = useState<boolean | null>(null)
  const [docList, setDocList] = useState<Array<{ docId: string; title: string; updatedAt: string }>>([])

  function update(partial: Partial<CloudSyncConfig>) {
    setCfg(prev => ({ ...prev, ...partial }))
  }

  // Check server on mount and when provider changes
  useEffect(() => {
    if (cfg.provider !== 'local') return
    checkLocalServer().then(ok => {
      setServerOnline(ok)
      if (ok) fetchDocList()
    })
  }, [cfg.provider])

  async function fetchDocList() {
    try {
      const res = await fetch(`${LOCAL_SERVER}/api/docs`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        const data = await res.json()
        setDocList(data.docs || [])
      }
    } catch { /* ignore */ }
  }

  async function doSync() {
    setSyncing(true)
    let ok = false
    if (cfg.provider === 'local') {
      const content = getContent?.() ?? {}
      ok = await pushToLocalServer(cfg.docId, content, { title: document.title || 'Untitled' })
    } else if (cfg.provider === 'mock') {
      // Mock: simulate 1s delay
      await new Promise(r => setTimeout(r, 1000))
      ok = true
    } else {
      ok = false
    }
    setSyncing(false)
    const now = new Date()
    if (ok) {
      setLastSync(now)
      fetchDocList()
    }
  }

  function save() {
    saveCloudSyncConfig(cfg)
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2000)
  }

  const PROVIDERS = [
    { value: 'local', label: '本地同步服务', icon: '🖥️', desc: `连接本地同步服务器 (localhost:3001)` },
    { value: 'mock',  label: '演示存储',   icon: '🗄️', desc: '模拟云端同步（不实际保存）' },
    { value: 'none',  label: '不使用云同步', icon: '🚫', desc: '禁用所有同步功能' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 10, width: 480, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#1e293b' }}>☁️ 同步设置</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Enable toggle */}
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, cursor: 'pointer' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>启用云端同步</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>将文档同步到服务器，持久化保存</div>
            </div>
            <div
              onClick={() => update({ enabled: !cfg.enabled })}
              style={{ width: 44, height: 24, borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s', background: cfg.enabled ? '#2563eb' : '#d1d5db', position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, transition: 'left 0.2s', left: cfg.enabled ? 22 : 2, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
          </label>

          {cfg.enabled && (
            <>
              {/* Provider */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>存储方式</div>
                {PROVIDERS.map(p => (
                  <label key={p.value} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 6,
                    border: `1px solid ${cfg.provider === p.value ? '#3b82f6' : '#e5e7eb'}`,
                    borderRadius: 8, cursor: 'pointer', background: cfg.provider === p.value ? '#eff6ff' : '#fff'
                  }}>
                    <input type="radio" name="provider" checked={cfg.provider === p.value} onChange={() => update({ provider: p.value as CloudSyncConfig['provider'] })} />
                    <span style={{ fontSize: 18 }}>{p.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{p.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Local server status */}
              {cfg.provider === 'local' && (
                <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>服务器状态</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: serverOnline === null ? '#9ca3af' : serverOnline ? '#16a34a' : '#dc2626' }}>
                      {serverOnline === null ? '检测中…' : serverOnline ? '● 在线' : '✕ 离线'}
                    </span>
                  </div>
                  {!serverOnline && serverOnline !== null && (
                    <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
                      启动同步服务器：<br />
                      <code style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: 4 }}>cd ~/projects/docx-editor && node sync-server/server.js</code>
                    </div>
                  )}
                  {serverOnline && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                        文档 ID：
                        <input value={cfg.docId} onChange={e => update({ docId: e.target.value })}
                          style={{ marginLeft: 8, padding: '2px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, width: 140 }} />
                      </div>
                      {docList.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>已保存文档：</div>
                          {docList.slice(0, 5).map(d => (
                            <div key={d.docId} style={{ fontSize: 11, color: '#374151', padding: '2px 0', display: 'flex', gap: 8 }}>
                              <span style={{ cursor: 'pointer', color: '#2563eb' }} onClick={() => update({ docId: d.docId })}>{d.docId}</span>
                              <span style={{ color: '#9ca3af' }}>{new Date(d.updatedAt).toLocaleString('zh-CN')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Auto sync */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={cfg.autoSync} onChange={e => update({ autoSync: e.target.checked })} />
                  自动同步
                </label>
                {cfg.autoSync && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 24, fontSize: 13, color: '#374151' }}>
                    <span>每隔</span>
                    <select value={cfg.syncIntervalMin} onChange={e => update({ syncIntervalMin: parseInt(e.target.value) })}
                      style={{ padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}>
                      {[1, 5, 10, 15, 30].map(n => <option key={n} value={n}>{n} 分钟</option>)}
                    </select>
                    <span>自动同步</span>
                  </div>
                )}
              </div>

              {/* Sync now */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1f2937' }}>手动同步</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>
                      {lastSync ? `上次同步：${lastSync.toLocaleString('zh-CN')}` : '尚未同步'}
                    </div>
                  </div>
                  <button onClick={doSync} disabled={syncing || cfg.provider === 'none'}
                    style={{ padding: '6px 16px', background: (syncing || cfg.provider === 'none') ? '#9ca3af' : '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: (syncing || cfg.provider === 'none') ? 'not-allowed' : 'pointer', fontSize: 12 }}>
                    {syncing ? '⟳ 同步中…' : '立即同步'}
                  </button>
                </div>
              </div>
            </>
          )}

          {!cfg.enabled && (
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              启用后可将文档同步至本地服务器，支持跨会话持久化
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: savedMsg ? '#16a34a' : 'transparent' }}>✓ 设置已保存</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '6px 16px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>取消</button>
            <button onClick={save} style={{ padding: '6px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>保存</button>
          </div>
        </div>
      </div>
    </div>
  )
}
