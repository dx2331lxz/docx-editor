import React from 'react'

export interface DocTheme {
  id: string
  name: string
  h1Color: string
  h2Color: string
  h3Color: string
  linkColor: string
  accentColor: string
  bgClass: string
}

export const THEMES: DocTheme[] = [
  { id: 'default',   name: '默认',   h1Color: '#111827', h2Color: '#1f2937', h3Color: '#374151', linkColor: '#2563eb', accentColor: '#3b82f6', bgClass: '' },
  { id: 'blue',      name: '商务蓝', h1Color: '#1e3a5f', h2Color: '#1d4ed8', h3Color: '#2563eb', linkColor: '#1d4ed8', accentColor: '#3b82f6', bgClass: 'theme-blue' },
  { id: 'orange',    name: '活力橙', h1Color: '#9a3412', h2Color: '#c2410c', h3Color: '#ea580c', linkColor: '#ea580c', accentColor: '#f97316', bgClass: 'theme-orange' },
  { id: 'green',     name: '森林绿', h1Color: '#14532d', h2Color: '#15803d', h3Color: '#16a34a', linkColor: '#16a34a', accentColor: '#22c55e', bgClass: 'theme-green' },
  { id: 'purple',    name: '优雅紫', h1Color: '#3b0764', h2Color: '#7e22ce', h3Color: '#9333ea', linkColor: '#9333ea', accentColor: '#a855f7', bgClass: 'theme-purple' },
  { id: 'red',       name: '经典红', h1Color: '#7f1d1d', h2Color: '#b91c1c', h3Color: '#dc2626', linkColor: '#dc2626', accentColor: '#ef4444', bgClass: 'theme-red' },
]

interface Props {
  currentTheme: DocTheme
  onSelect: (theme: DocTheme) => void
  onClose: () => void
}

const ThemeDialog: React.FC<Props> = ({ currentTheme, onSelect, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[480px] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">文档主题</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {THEMES.map(theme => (
            <button
              key={theme.id}
              onClick={() => { onSelect(theme); onClose() }}
              className={`border-2 rounded-lg p-3 text-left transition-all hover:shadow-md ${
                currentTheme.id === theme.id ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Theme preview */}
              <div className="mb-2 space-y-1">
                <div className="h-2.5 rounded" style={{ background: theme.h1Color, width: '90%' }} />
                <div className="h-2 rounded" style={{ background: theme.h2Color, width: '70%' }} />
                <div className="h-1.5 rounded" style={{ background: theme.accentColor, width: '50%' }} />
              </div>
              <span className="text-xs font-medium text-gray-700">{theme.name}</span>
              {currentTheme.id === theme.id && <span className="text-blue-500 text-xs ml-1">✓</span>}
            </button>
          ))}
        </div>

        <button onClick={onClose} className="w-full py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm">关闭</button>
      </div>
    </div>
  )
}

export default ThemeDialog
