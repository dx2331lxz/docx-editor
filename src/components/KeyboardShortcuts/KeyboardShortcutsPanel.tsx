/**
 * KeyboardShortcutsPanel — 键盘快捷键参考面板
 * 分类展示、搜索过滤、自定义快捷键(localStorage)
 */
import React, { useState, useMemo } from 'react'

interface ShortcutItem {
  id: string
  category: string
  action: string
  defaultKey: string
  description?: string
}

const DEFAULT_SHORTCUTS: ShortcutItem[] = [
  // 编辑
  { id: 'undo', category: '编辑', action: '撤销', defaultKey: 'Ctrl+Z' },
  { id: 'redo', category: '编辑', action: '重做', defaultKey: 'Ctrl+Y' },
  { id: 'cut', category: '编辑', action: '剪切', defaultKey: 'Ctrl+X' },
  { id: 'copy', category: '编辑', action: '复制', defaultKey: 'Ctrl+C' },
  { id: 'paste', category: '编辑', action: '粘贴', defaultKey: 'Ctrl+V' },
  { id: 'selectAll', category: '编辑', action: '全选', defaultKey: 'Ctrl+A' },
  { id: 'find', category: '编辑', action: '查找', defaultKey: 'Ctrl+F' },
  { id: 'replace', category: '编辑', action: '查找替换', defaultKey: 'Ctrl+H' },
  // 格式
  { id: 'bold', category: '格式', action: '加粗', defaultKey: 'Ctrl+B' },
  { id: 'italic', category: '格式', action: '斜体', defaultKey: 'Ctrl+I' },
  { id: 'underline', category: '格式', action: '下划线', defaultKey: 'Ctrl+U' },
  { id: 'strikethrough', category: '格式', action: '删除线', defaultKey: 'Ctrl+Shift+S' },
  { id: 'subscript', category: '格式', action: '下标', defaultKey: 'Ctrl+,' },
  { id: 'superscript', category: '格式', action: '上标', defaultKey: 'Ctrl+Shift+=' },
  { id: 'clearFormat', category: '格式', action: '清除格式', defaultKey: 'Ctrl+\\' },
  { id: 'alignLeft', category: '格式', action: '左对齐', defaultKey: 'Ctrl+L' },
  { id: 'alignCenter', category: '格式', action: '居中对齐', defaultKey: 'Ctrl+E' },
  { id: 'alignRight', category: '格式', action: '右对齐', defaultKey: 'Ctrl+R' },
  { id: 'alignJustify', category: '格式', action: '两端对齐', defaultKey: 'Ctrl+J' },
  { id: 'indent', category: '格式', action: '增加缩进', defaultKey: 'Tab' },
  { id: 'outdent', category: '格式', action: '减少缩进', defaultKey: 'Shift+Tab' },
  { id: 'bulletList', category: '格式', action: '项目符号列表', defaultKey: 'Ctrl+Shift+8' },
  { id: 'orderedList', category: '格式', action: '编号列表', defaultKey: 'Ctrl+Shift+7' },
  // 插入
  { id: 'pageBreak', category: '插入', action: '分页符', defaultKey: 'Ctrl+Enter' },
  { id: 'link', category: '插入', action: '超链接', defaultKey: 'Ctrl+K' },
  { id: 'newLine', category: '插入', action: '软换行', defaultKey: 'Shift+Enter' },
  { id: 'hardBreak', category: '插入', action: '换行（保持格式）', defaultKey: 'Ctrl+Shift+Enter' },
  // 视图
  { id: 'zoomIn', category: '视图', action: '放大', defaultKey: 'Ctrl++' },
  { id: 'zoomOut', category: '视图', action: '缩小', defaultKey: 'Ctrl+-' },
  { id: 'zoomReset', category: '视图', action: '重置缩放', defaultKey: 'Ctrl+0' },
  // 导航
  { id: 'goDocStart', category: '导航', action: '跳到文档开头', defaultKey: 'Ctrl+Home' },
  { id: 'goDocEnd', category: '导航', action: '跳到文档末尾', defaultKey: 'Ctrl+End' },
  { id: 'goLineStart', category: '导航', action: '行首', defaultKey: 'Home' },
  { id: 'goLineEnd', category: '导航', action: '行尾', defaultKey: 'End' },
  { id: 'goWordLeft', category: '导航', action: '向左跳词', defaultKey: 'Ctrl+←' },
  { id: 'goWordRight', category: '导航', action: '向右跳词', defaultKey: 'Ctrl+→' },
  { id: 'selectToEnd', category: '导航', action: '选到文档末尾', defaultKey: 'Ctrl+Shift+End' },
  { id: 'selectToStart', category: '导航', action: '选到文档开头', defaultKey: 'Ctrl+Shift+Home' },
  // 文件
  { id: 'save', category: '文件', action: '保存', defaultKey: 'Ctrl+S' },
  { id: 'newDoc', category: '文件', action: '新建', defaultKey: 'Ctrl+N' },
  { id: 'print', category: '文件', action: '打印', defaultKey: 'Ctrl+P' },
]

const STORAGE_KEY = 'docx-editor-custom-shortcuts'

interface KeyboardShortcutsPanelProps {
  onClose: () => void
}

const KeyboardShortcutsPanel: React.FC<KeyboardShortcutsPanelProps> = ({ onClose }) => {
  const [search, setSearch] = useState('')
  const [customKeys, setCustomKeys] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
  })
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [filterCat, setFilterCat] = useState('全部')

  const categories = ['全部', ...Array.from(new Set(DEFAULT_SHORTCUTS.map(s => s.category)))]

  const filtered = useMemo(() => {
    return DEFAULT_SHORTCUTS.filter(s => {
      const key = customKeys[s.id] ?? s.defaultKey
      const matchCat = filterCat === '全部' || s.category === filterCat
      const matchSearch = !search ||
        s.action.includes(search) ||
        key.toLowerCase().includes(search.toLowerCase())
      return matchCat && matchSearch
    })
  }, [search, filterCat, customKeys])

  const grouped = filtered.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = []
    acc[s.category].push(s)
    return acc
  }, {} as Record<string, ShortcutItem[]>)

  const startEdit = (id: string, current: string) => {
    setEditing(id)
    setEditValue(current)
  }

  const saveEdit = (id: string) => {
    const updated = { ...customKeys, [id]: editValue }
    setCustomKeys(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setEditing(null)
  }

  const resetShortcut = (id: string) => {
    const updated = { ...customKeys }
    delete updated[id]
    setCustomKeys(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const resetAll = () => {
    setCustomKeys({})
    localStorage.removeItem(STORAGE_KEY)
  }

  const captureKey = (e: React.KeyboardEvent) => {
    e.preventDefault()
    const parts: string[] = []
    if (e.ctrlKey) parts.push('Ctrl')
    if (e.shiftKey) parts.push('Shift')
    if (e.altKey) parts.push('Alt')
    const key = e.key
    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
      parts.push(key.length === 1 ? key.toUpperCase() : key)
    }
    if (parts.length > 0) setEditValue(parts.join('+'))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[680px] flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-base font-semibold">⌨ 键盘快捷键</h3>
          <div className="flex items-center gap-2">
            <button className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded border border-red-200 hover:bg-red-50"
              onClick={resetAll}>重置全部</button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
        </div>

        {/* Search + category filter */}
        <div className="px-5 py-2 border-b flex gap-3 items-center">
          <input
            type="text" placeholder="搜索快捷键或操作..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
          />
          <div className="flex gap-1 flex-wrap">
            {categories.map(c => (
              <button key={c}
                className={`px-2 py-0.5 rounded text-xs ${filterCat === c ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                onClick={() => setFilterCat(c)}>{c}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="sticky top-0 bg-gray-50 px-5 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b">
                {cat}
              </div>
              {items.map(item => {
                const currentKey = customKeys[item.id] ?? item.defaultKey
                const isCustom = !!customKeys[item.id]
                return (
                  <div key={item.id} className="flex items-center justify-between px-5 py-2 hover:bg-gray-50 group">
                    <span className="text-sm text-gray-700">{item.action}</span>
                    <div className="flex items-center gap-2">
                      {editing === item.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            value={editValue}
                            onChange={() => {}}
                            onKeyDown={captureKey}
                            placeholder="按下快捷键..."
                            className="border border-blue-400 rounded px-2 py-0.5 text-xs w-36 font-mono bg-blue-50"
                          />
                          <button className="text-xs text-blue-600 hover:text-blue-800 px-1" onClick={() => saveEdit(item.id)}>✓</button>
                          <button className="text-xs text-gray-400 hover:text-gray-600 px-1" onClick={() => setEditing(null)}>✕</button>
                        </div>
                      ) : (
                        <>
                          <kbd className={`px-2 py-0.5 rounded text-xs font-mono border ${isCustom ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-gray-100 border-gray-300 text-gray-700'}`}>
                            {currentKey}
                          </kbd>
                          {isCustom && (
                            <button className="text-xs text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                              onClick={() => resetShortcut(item.id)} title="重置为默认">↺</button>
                          )}
                          <button className="text-xs text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 px-1"
                            onClick={() => startEdit(item.id, currentKey)} title="自定义">✎</button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center text-gray-400 py-12 text-sm">没有匹配的快捷键</div>
          )}
        </div>

        <div className="px-5 py-2 border-t bg-gray-50 text-xs text-gray-400 flex items-center justify-between">
          <span>点击 ✎ 自定义快捷键（仅为参考，实际绑定需代码支持）</span>
          <span>{Object.keys(customKeys).length} 个已自定义</span>
        </div>
      </div>
    </div>
  )
}

export default KeyboardShortcutsPanel
