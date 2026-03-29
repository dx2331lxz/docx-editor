import { API } from '../../lib/apiRoutes'
import React, { useState, useEffect } from 'react'

interface AIConfig {
  endpoint: string
  apiKey: string
  model: string
}

const DEFAULT_ENDPOINT = 'https://api.siliconflow.cn/v1/chat/completions'
const MODEL_PRESETS = [
  'Pro/moonshotai/Kimi-K2.5',
  'Qwen/Qwen3-235B-A22B',
  'deepseek-ai/DeepSeek-V3',
  'deepseek-ai/DeepSeek-R1',
  'gpt-4o',
  'gpt-4o-mini',
]

/** Inline AI settings form — embeddable in SettingsPanel or standalone dialog. */
export default function AISettingsContent() {
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT)
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('Pro/moonshotai/Kimi-K2.5')
  const [apiKeyMasked, setApiKeyMasked] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null)
  const [error, setError] = useState('')
  const [apiKeyEditing, setApiKeyEditing] = useState(false)

  useEffect(() => {
    fetch(API.config)
      .then(r => r.json())
      .then((cfg: AIConfig) => {
        setEndpoint(cfg.endpoint || DEFAULT_ENDPOINT)
        setApiKeyMasked(cfg.apiKey || '')
        setModel(cfg.model || 'Pro/moonshotai/Kimi-K2.5')
        setApiKey('')
        setApiKeyEditing(false)
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const body: Partial<AIConfig> = { endpoint, model }
      if (apiKeyEditing && apiKey) body.apiKey = apiKey
      const r = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) throw new Error('保存失败')
      setSaved(true)
      setApiKeyEditing(false)
      const cfg = await fetch(API.config).then(x => x.json())
      setApiKeyMasked(cfg.apiKey || '')
      setApiKey('')
      setTimeout(() => setSaved(false), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await fetch(API.aiChat, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: 'hi' }], max_tokens: 10, stream: false }),
      })
      const data = await r.json()
      setTestResult(data.choices ? 'ok' : 'fail')
    } catch {
      setTestResult('fail')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>AI 配置</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Endpoint */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
            API 端点
          </label>
          <input
            type="url"
            style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            value={endpoint}
            onChange={e => setEndpoint(e.target.value)}
            placeholder={DEFAULT_ENDPOINT}
          />
        </div>

        {/* API Key */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
            API Key
          </label>
          {!apiKeyEditing ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                readOnly
                style={{ flex: 1, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, background: '#f9fafb', color: '#6b7280' }}
                value={apiKeyMasked || '（未设置）'}
              />
              <button
                style={{ padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}
                onClick={() => { setApiKeyEditing(true); setApiKey('') }}
              >
                修改
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="password"
                autoFocus
                style={{ flex: 1, padding: '7px 10px', border: '1px solid #3b82f6', borderRadius: 6, fontSize: 13, outline: 'none' }}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="输入新的 API Key"
              />
              <button
                style={{ padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}
                onClick={() => { setApiKeyEditing(false); setApiKey('') }}
              >
                取消
              </button>
            </div>
          )}
        </div>

        {/* Model */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
            模型
          </label>
          <input
            type="text"
            list="ai-model-presets"
            style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            value={model}
            onChange={e => setModel(e.target.value)}
            placeholder="模型名称"
          />
          <datalist id="ai-model-presets">
            {MODEL_PRESETS.map(m => <option key={m} value={m} />)}
          </datalist>
        </div>
      </div>

      {error && <p style={{ margin: '12px 0 0', fontSize: 12, color: '#ef4444' }}>{error}</p>}

      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <button
          style={{ padding: '7px 14px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}
          onClick={handleTest}
          disabled={testing}
        >
          {testing ? '测试中...' : '测试连接'}
          {testResult === 'ok' && ' ✅'}
          {testResult === 'fail' && ' ❌'}
        </button>
        <button
          style={{ padding: '7px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '保存中...' : saved ? '已保存 ✅' : '保存'}
        </button>
      </div>
    </div>
  )
}
