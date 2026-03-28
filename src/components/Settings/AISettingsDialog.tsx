import React, { useState, useEffect } from 'react'

interface AIConfig {
  endpoint: string
  apiKey: string
  model: string
}

interface Props {
  open: boolean
  onClose: () => void
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

export const AISettingsDialog: React.FC<Props> = ({ open, onClose }) => {
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
    if (!open) return
    fetch('/api/config')
      .then(r => r.json())
      .then((cfg: AIConfig) => {
        setEndpoint(cfg.endpoint || DEFAULT_ENDPOINT)
        setApiKeyMasked(cfg.apiKey || '')
        setModel(cfg.model || 'Pro/moonshotai/Kimi-K2.5')
        setApiKey('')
        setApiKeyEditing(false)
      })
      .catch(() => {})
  }, [open])

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
      // Refresh masked key
      const cfg = await fetch('/api/config').then(x => x.json())
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
      const r = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 10,
          stream: false,
        }),
      })
      const data = await r.json()
      setTestResult(data.choices ? 'ok' : 'fail')
    } catch {
      setTestResult('fail')
    } finally {
      setTesting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-[480px] max-w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">AI 设置</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API 端点</label>
            <input
              type="url"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={endpoint}
              onChange={e => setEndpoint(e.target.value)}
              placeholder={DEFAULT_ENDPOINT}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            {!apiKeyEditing ? (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  readOnly
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50 text-gray-500"
                  value={apiKeyMasked || '（未设置）'}
                />
                <button
                  className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  onClick={() => { setApiKeyEditing(true); setApiKey('') }}
                >
                  修改
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <input
                  type="password"
                  autoFocus
                  className="flex-1 border border-blue-400 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="输入新的 API Key"
                />
                <button
                  className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  onClick={() => { setApiKeyEditing(false); setApiKey('') }}
                >
                  取消
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">模型</label>
            <div className="flex gap-2">
              <input
                type="text"
                list="model-presets"
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="模型名称"
              />
              <datalist id="model-presets">
                {MODEL_PRESETS.map(m => <option key={m} value={m} />)}
              </datalist>
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            onClick={handleTest}
            disabled={testing}
          >
            {testing ? '测试中...' : '测试连接'}
            {testResult === 'ok' && ' ✅'}
            {testResult === 'fail' && ' ❌'}
          </button>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
              onClick={onClose}
            >
              关闭
            </button>
            <button
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '保存中...' : saved ? '已保存 ✅' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AISettingsDialog
