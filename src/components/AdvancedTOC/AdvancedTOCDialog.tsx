/**
 * AdvancedTOCDialog — 自定义目录对话框
 * 支持：显示级别、制表符前导符样式、页码右对齐、手动标记目录项
 */
import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'

interface AdvancedTOCDialogProps {
  editor: Editor | null
  onClose: () => void
}

type LeaderType = 'dots' | 'dashes' | 'underline' | 'none'

interface TOCConfig {
  maxLevel: number
  leader: LeaderType
  rightAlign: boolean
  showPageNums: boolean
  hyperlinks: boolean
}

const LEADER_PREVIEW: Record<LeaderType, string> = {
  dots: '标题一..........1',
  dashes: '标题一----------1',
  underline: '标题一__________1',
  none: '标题一          1',
}

const AdvancedTOCDialog: React.FC<AdvancedTOCDialogProps> = ({ editor, onClose }) => {
  const [config, setConfig] = useState<TOCConfig>({
    maxLevel: 3,
    leader: 'dots',
    rightAlign: true,
    showPageNums: true,
    hyperlinks: true,
  })
  const [manualEntry, setManualEntry] = useState('')
  const [manualLevel, setManualLevel] = useState(1)

  const handleInsertTOC = () => {
    if (!editor) return
    // Collect headings up to maxLevel
    const entries: { level: number; text: string; pageEst: number }[] = []
    let charCount = 0
    const CHARS_PER_PAGE = 800

    editor.state.doc.descendants((node) => {
      if (node.type.name === 'paragraph') charCount += node.textContent.length
      if (node.type.name === 'heading') {
        const level = node.attrs.level as number
        const text = node.textContent.trim()
        if (text && level <= config.maxLevel) {
          entries.push({ level, text, pageEst: Math.max(1, Math.ceil(charCount / CHARS_PER_PAGE)) })
          charCount += node.textContent.length
        }
      }
    })

    const leaderChar = config.leader === 'dots' ? '·' : config.leader === 'dashes' ? '-' : config.leader === 'underline' ? '_' : ' '

    const rows = entries.map(e => {
      const indent = (e.level - 1) * 20
      const weight = e.level === 1 ? 'font-weight:600;' : e.level === 2 ? 'font-weight:500;' : ''
      const size = e.level === 1 ? 'font-size:14px;' : e.level === 2 ? 'font-size:13px;' : 'font-size:12px;'
      const pageStr = config.showPageNums ? `<span style="margin-left:4px;color:#6b7280;font-size:11px;">${e.pageEst}</span>` : ''
      const leaderStr = config.showPageNums && config.leader !== 'none'
        ? `<span style="flex:1;overflow:hidden;color:#9ca3af;letter-spacing:2px;font-size:10px;padding:0 4px;"> ${leaderChar.repeat(40)}</span>`
        : `<span style="flex:1;"></span>`

      return `<div style="display:flex;align-items:baseline;padding:1px 0;padding-left:${indent}px;${weight}${size}cursor:pointer;" onclick="(function(el){var h=document.querySelector('.ProseMirror');if(h){var nodes=h.querySelectorAll('h1,h2,h3,h4,h5,h6');for(var n of nodes){if(n.textContent.trim()==='${e.text.replace(/'/g, "\\'")}'){n.scrollIntoView({behavior:'smooth'});break;}}}})(this)">
        <span style="color:#1f2937;">${e.text}</span>
        ${leaderStr}
        ${pageStr}
      </div>`
    }).join('')

    const tocHtml = `<div class="toc-block-adv" data-toc-max-level="${config.maxLevel}" contenteditable="false" style="border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;margin:8px 0;background:#fafafa;">
      <div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">目录</div>
      ${rows || '<div style="color:#9ca3af;font-size:12px;text-align:center;padding:8px;">文档中没有找到标题</div>'}
    </div>`

    editor.chain().focus().insertContent(tocHtml).run()
    onClose()
  }

  const handleMarkEntry = () => {
    if (!editor || !manualEntry.trim()) return
    // Insert a hidden "TOC entry" mark at cursor position
    const entryHtml = `<span class="toc-entry-mark" data-toc-text="${manualEntry}" data-toc-level="${manualLevel}" contenteditable="false" style="background:#fef3c7;border:1px solid #fcd34d;border-radius:2px;padding:0 3px;font-size:10px;color:#92400e;cursor:default;" title="目录标记 L${manualLevel}">📑L${manualLevel}</span>`
    editor.chain().focus().insertContent(entryHtml).run()
    setManualEntry('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[420px] p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-4 text-gray-800">自定义目录</h3>

        {/* Max level */}
        <div className="mb-3">
          <label className="block text-sm text-gray-600 mb-1">显示级别</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(l => (
              <button key={l}
                className={`flex-1 py-1 text-sm rounded border transition-colors ${config.maxLevel === l ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300 hover:bg-gray-50'}`}
                onClick={() => setConfig(c => ({ ...c, maxLevel: l }))}
              >
                {l}级
              </button>
            ))}
          </div>
        </div>

        {/* Leader */}
        <div className="mb-3">
          <label className="block text-sm text-gray-600 mb-1">制表符前导符</label>
          <div className="space-y-1">
            {([['dots', '点前导符'], ['dashes', '线前导符'], ['underline', '下划线'], ['none', '无']] as [LeaderType, string][]).map(([v, l]) => (
              <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={config.leader === v} onChange={() => setConfig(c => ({ ...c, leader: v }))} />
                <span className="flex-1">{l}</span>
                <span className="font-mono text-xs text-gray-400 w-32 truncate">{LEADER_PREVIEW[v]}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="mb-4 space-y-1.5">
          {([
            ['showPageNums', '显示页码'],
            ['rightAlign', '页码右对齐'],
            ['hyperlinks', '使用超链接代替页码'],
          ] as [keyof TOCConfig, string][]).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={config[key] as boolean}
                onChange={e => setConfig(c => ({ ...c, [key]: e.target.checked }))}
              />
              {label}
            </label>
          ))}
        </div>

        {/* Manual entry */}
        <div className="mb-4 p-3 bg-amber-50 rounded border border-amber-200">
          <div className="text-xs font-medium text-amber-800 mb-2">手动标记目录项</div>
          <div className="flex gap-2 mb-1.5">
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
              placeholder="目录项文字..."
              value={manualEntry}
              onChange={e => setManualEntry(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleMarkEntry()}
            />
            <select
              className="border border-gray-300 rounded px-1 text-sm w-16"
              value={manualLevel}
              onChange={e => setManualLevel(parseInt(e.target.value))}
            >
              {[1, 2, 3].map(l => <option key={l} value={l}>L{l}</option>)}
            </select>
          </div>
          <button
            className="text-xs px-3 py-1 bg-amber-500 text-white rounded hover:bg-amber-600"
            onClick={handleMarkEntry}
          >在光标处插入标记</button>
        </div>

        <div className="flex gap-2 justify-end">
          <button className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded" onClick={onClose}>取消</button>
          <button className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" onClick={handleInsertTOC}>插入目录</button>
        </div>
      </div>
    </div>
  )
}

export default AdvancedTOCDialog
