/**
 * DocProtectDialog — document protection settings.
 * Supports: no protection / read-only / allow comments only.
 * Optional password to lock/unlock.
 */
import React, { useState } from 'react'
import { X, Lock, Unlock, Eye } from 'lucide-react'

export type ProtectionMode = 'none' | 'readonly' | 'comments'

export interface DocProtectionConfig {
  mode: ProtectionMode
  password: string
}

export const DEFAULT_PROTECTION: DocProtectionConfig = { mode: 'none', password: '' }

interface DocProtectDialogProps {
  config: DocProtectionConfig
  onApply: (cfg: DocProtectionConfig) => void
  onClose: () => void
}

const MODES = [
  { id: 'none', label: '不保护', desc: '允许所有编辑操作', icon: Unlock },
  { id: 'readonly', label: '只读保护', desc: '禁止所有编辑，只允许阅读', icon: Lock },
  { id: 'comments', label: '允许批注', desc: '只允许插入批注，不允许修改正文', icon: Eye },
] as const

const DocProtectDialog: React.FC<DocProtectDialogProps> = ({ config, onApply, onClose }) => {
  const [mode, setMode] = useState<ProtectionMode>(config.mode)
  const [password, setPassword] = useState(config.password)
  const [confirmPwd, setConfirmPwd] = useState(config.password)
  const [showPwd, setShowPwd] = useState(false)
  const [pwdError, setPwdError] = useState('')

  const handleApply = () => {
    if (mode !== 'none' && password && password !== confirmPwd) {
      setPwdError('两次密码不一致')
      return
    }
    setPwdError('')
    onApply({ mode, password: mode === 'none' ? '' : password })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-2xl w-[400px] border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="font-semibold text-gray-800 flex items-center gap-2">
            <Lock size={15} className="text-blue-500" />
            保护文档
          </span>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-500">选择保护方式：</p>
          <div className="space-y-2">
            {MODES.map((m) => {
              const Icon = m.icon
              return (
                <label key={m.id} className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${mode === m.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="protect-mode" value={m.id} checked={mode === m.id} onChange={() => setMode(m.id)} className="mt-0.5" />
                  <Icon size={15} className={`mt-0.5 flex-shrink-0 ${mode === m.id ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{m.label}</p>
                    <p className="text-xs text-gray-500">{m.desc}</p>
                  </div>
                </label>
              )
            })}
          </div>

          {mode !== 'none' && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium text-gray-600">密码保护（可选）</p>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="设置密码（留空则无密码）"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPwd((v) => !v)}>
                  <Eye size={14} />
                </button>
              </div>
              {password && (
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="再次确认密码"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                />
              )}
              {pwdError && <p className="text-xs text-red-500">{pwdError}</p>}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button type="button" className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-100" onClick={onClose}>取消</button>
          <button type="button" className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700" onClick={handleApply}>确定</button>
        </div>
      </div>
    </div>
  )
}

export default DocProtectDialog

// ── Password unlock dialog ─────────────────────────────────────────────────────

interface UnlockDialogProps {
  onUnlock: (pwd: string) => void
  onClose: () => void
}

export const UnlockDialog: React.FC<UnlockDialogProps> = ({ onUnlock, onClose }) => {
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-2xl w-72 border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="font-semibold text-gray-800 flex items-center gap-2">
            <Lock size={14} className="text-amber-500" /> 解除文档保护
          </span>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3">
          <input
            type="password"
            placeholder="输入保护密码"
            autoFocus
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { onUnlock(pwd); setError('密码错误，请重试') }
              if (e.key === 'Escape') onClose()
            }}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button type="button" className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-100" onClick={onClose}>取消</button>
          <button type="button" className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700" onClick={() => onUnlock(pwd)}>解除保护</button>
        </div>
      </div>
    </div>
  )
}
