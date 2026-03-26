import React, { useState, useRef } from 'react'

export interface Tab {
  id: string
  title: string
  content: string
  isDirty: boolean
}

interface TabBarProps {
  tabs: Tab[]
  activeTabId: string
  onTabSelect: (id: string) => void
  onTabClose: (id: string) => void
  onTabNew: () => void
  onTabRename: (id: string, title: string) => void
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabNew,
  onTabRename,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startRename = (tab: Tab, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(tab.id)
    setEditValue(tab.title)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commitRename = (id: string) => {
    if (editValue.trim()) {
      onTabRename(id, editValue.trim())
    }
    setEditingId(null)
  }

  return (
    <div className="glass-tabbar flex items-center bg-gray-200 border-b border-gray-300 overflow-x-auto shrink-0"
         style={{ minHeight: '32px', maxHeight: '32px' }}>
      <div className="flex items-end h-full overflow-x-auto">
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId
          return (
            <div
              key={tab.id}
              onClick={() => onTabSelect(tab.id)}
              className={`flex items-center gap-1 px-3 py-1 cursor-pointer border-r border-gray-300 shrink-0 text-sm select-none group
                ${isActive
                  ? 'bg-white border-t-2 border-t-blue-500 text-gray-800 font-medium'
                  : 'bg-gray-100 hover:bg-gray-50 text-gray-600'}`}
              style={{ minWidth: '80px', maxWidth: '160px' }}
              onDoubleClick={(e) => startRename(tab, e)}
            >
              {editingId === tab.id ? (
                <input
                  ref={inputRef}
                  className="w-full text-sm outline-none bg-transparent"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={() => commitRename(tab.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitRename(tab.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="truncate flex-1" title={tab.title}>
                  {tab.isDirty ? '● ' : ''}{tab.title}
                </span>
              )}
              {tabs.length > 1 && (
                <button
                  onClick={e => { e.stopPropagation(); onTabClose(tab.id) }}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-500 text-gray-400 text-xs leading-none ml-1 shrink-0"
                  title="关闭标签"
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
      </div>
      <button
        onClick={onTabNew}
        className="px-2 py-1 text-gray-500 hover:text-blue-600 hover:bg-gray-100 shrink-0 text-lg leading-none"
        title="新建标签"
      >
        +
      </button>
    </div>
  )
}

export default TabBar
