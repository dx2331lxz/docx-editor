/**
 * FootnoteSettingsDialog — 脚注/尾注增强设置对话框
 * 支持：编号格式（1,2,3 / a,b,c / i,ii,iii）、每页重新编号、
 *       自定义分隔线样式、脚注↔尾注转换
 */
import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'

interface FootnoteSettingsDialogProps {
  editor: Editor | null
  onClose: () => void
}

type NumberFormat = 'arabic' | 'alpha' | 'roman' | 'circled'
type RestartRule = 'continuous' | 'page' | 'section'
type LineStyle = 'solid' | 'dashed' | 'double' | 'none'

interface FootnoteSettings {
  footnoteFormat: NumberFormat
  endnoteFormat: NumberFormat
  restart: RestartRule
  startNum: number
  lineStyle: LineStyle
  lineColor: string
  lineWidth: number
}

function formatNum(n: number, fmt: NumberFormat): string {
  if (fmt === 'arabic') return String(n)
  if (fmt === 'alpha') return String.fromCharCode(96 + Math.min(n, 26))
  if (fmt === 'roman') {
    const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1]
    const syms = ['m','cm','d','cd','c','xc','l','xl','x','ix','v','iv','i']
    let res = ''
    let num = n
    vals.forEach((v, i) => { while (num >= v) { res += syms[i]; num -= v } })
    return res
  }
  const circles = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩']
  return circles[n - 1] ?? String(n)
}

const FootnoteSettingsDialog: React.FC<FootnoteSettingsDialogProps> = ({ editor, onClose }) => {
  const [settings, setSettings] = useState<FootnoteSettings>({
    footnoteFormat: 'arabic',
    endnoteFormat: 'roman',
    restart: 'continuous',
    startNum: 1,
    lineStyle: 'solid',
    lineColor: '#9ca3af',
    lineWidth: 1,
  })
  const [activeTab, setActiveTab] = useState<'settings' | 'convert'>('settings')
  const [convertDirection, setConvertDirection] = useState<'fn2en' | 'en2fn'>('fn2en')

  const applySettings = () => {
    if (!editor) return

    // Apply CSS custom properties to the editor root for footnote styling
    const editorEl = document.querySelector('.ProseMirror') as HTMLElement | null
    if (editorEl) {
      editorEl.style.setProperty('--footnote-line-style', settings.lineStyle === 'none' ? 'none' : `${settings.lineWidth}px ${settings.lineStyle} ${settings.lineColor}`)
    }

    // Update all footnote ref marks with new format
    let fnCount = 0
    let enCount = 0
    const { tr } = editor.state
    let changed = false

    editor.state.doc.descendants((node, pos) => {
      node.marks.forEach(mark => {
        if (mark.type.name === 'footnoteRef') {
          const isEndnote = mark.attrs.type === 'endnote'
          if (isEndnote) enCount++; else fnCount++
          const newIndex = isEndnote ? enCount : fnCount
          if (mark.attrs.index !== newIndex) {
            tr.addMark(pos, pos + node.nodeSize, mark.type.create({ ...mark.attrs, index: newIndex }))
            changed = true
          }
        }
      })
    })

    if (changed) editor.view.dispatch(tr)

    // Store settings in data attrs on the footnote section
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'footnoteSection') {
        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            fnFormat: settings.footnoteFormat,
            enFormat: settings.endnoteFormat,
            restart: settings.restart,
            startNum: settings.startNum,
          })
        )
      }
    })

    onClose()
  }

  const handleConvert = () => {
    if (!editor) return
    const { tr } = editor.state
    const footnoteRefType = editor.schema.marks['footnoteRef']
    if (!footnoteRefType) return

    editor.state.doc.descendants((node, pos) => {
      node.marks.forEach(mark => {
        if (mark.type.name === 'footnoteRef') {
          const isEndnote = mark.attrs.type === 'endnote'
          if ((convertDirection === 'fn2en' && !isEndnote) || (convertDirection === 'en2fn' && isEndnote)) {
            tr.addMark(pos, pos + node.nodeSize, footnoteRefType.create({
              ...mark.attrs,
              type: isEndnote ? 'footnote' : 'endnote',
            }))
          }
        }
      })
    })

    editor.view.dispatch(tr)
    onClose()
  }

  const NUM_FORMATS: [NumberFormat, string, string][] = [
    ['arabic', '1, 2, 3 ...', formatNum(1, 'arabic')],
    ['alpha', 'a, b, c ...', formatNum(1, 'alpha')],
    ['roman', 'i, ii, iii ...', formatNum(1, 'roman')],
    ['circled', '①, ②, ③ ...', formatNum(1, 'circled')],
  ]

  const lineStyles: [LineStyle, string][] = [
    ['solid', '实线'],
    ['dashed', '虚线'],
    ['double', '双线'],
    ['none', '无'],
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-96 p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-4 text-gray-800">脚注和尾注</h3>

        {/* Tabs */}
        <div className="flex border-b mb-4">
          {(['settings', 'convert'] as const).map(t => (
            <button
              key={t}
              className={`px-4 py-2 text-sm border-b-2 transition-colors ${activeTab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab(t)}
            >
              {t === 'settings' ? '设置' : '转换'}
            </button>
          ))}
        </div>

        {activeTab === 'settings' && (
          <div className="space-y-3">
            {/* Footnote format */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">脚注编号格式</label>
              <select
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                value={settings.footnoteFormat}
                onChange={e => setSettings(s => ({ ...s, footnoteFormat: e.target.value as NumberFormat }))}
              >
                {NUM_FORMATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            {/* Endnote format */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">尾注编号格式</label>
              <select
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                value={settings.endnoteFormat}
                onChange={e => setSettings(s => ({ ...s, endnoteFormat: e.target.value as NumberFormat }))}
              >
                {NUM_FORMATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            {/* Restart rule */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">编号规则</label>
              <div className="space-y-1">
                {([
                  ['continuous', '连续编号'],
                  ['page', '每页重新编号'],
                  ['section', '每节重新编号'],
                ] as [RestartRule, string][]).map(([v, l]) => (
                  <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={settings.restart === v} onChange={() => setSettings(s => ({ ...s, restart: v }))} />
                    {l}
                  </label>
                ))}
              </div>
            </div>

            {/* Start number */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">起始编号</label>
              <input
                type="number" min={1} max={100}
                className="w-24 border border-gray-300 rounded px-2 py-1.5 text-sm"
                value={settings.startNum}
                onChange={e => setSettings(s => ({ ...s, startNum: Math.max(1, parseInt(e.target.value) || 1) }))}
              />
            </div>

            {/* Separator line */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">脚注分隔线</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                  value={settings.lineStyle}
                  onChange={e => setSettings(s => ({ ...s, lineStyle: e.target.value as LineStyle }))}
                >
                  {lineStyles.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <div className="flex items-center gap-1">
                  <input
                    type="color"
                    className="w-8 h-8 border rounded cursor-pointer"
                    value={settings.lineColor}
                    onChange={e => setSettings(s => ({ ...s, lineColor: e.target.value }))}
                  />
                  <input
                    type="number" min={1} max={4}
                    className="w-12 border border-gray-300 rounded px-2 py-1.5 text-sm"
                    value={settings.lineWidth}
                    onChange={e => setSettings(s => ({ ...s, lineWidth: parseInt(e.target.value) || 1 }))}
                  />
                  <span className="text-xs text-gray-500">px</span>
                </div>
              </div>
              {settings.lineStyle !== 'none' && (
                <div className="mt-2" style={{
                  borderTop: `${settings.lineWidth}px ${settings.lineStyle} ${settings.lineColor}`,
                  width: '60%',
                }} />
              )}
            </div>
          </div>
        )}

        {activeTab === 'convert' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">将文档中的脚注转换为尾注，或尾注转换为脚注。</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={convertDirection === 'fn2en'} onChange={() => setConvertDirection('fn2en')} />
                脚注 → 尾注（所有脚注转为尾注）
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={convertDirection === 'en2fn'} onChange={() => setConvertDirection('en2fn')} />
                尾注 → 脚注（所有尾注转为脚注）
              </label>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded" onClick={onClose}>取消</button>
              <button className="px-4 py-1.5 text-sm bg-amber-500 text-white rounded hover:bg-amber-600" onClick={handleConvert}>执行转换</button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="flex gap-2 justify-end mt-4">
            <button className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded" onClick={onClose}>取消</button>
            <button className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" onClick={applySettings}>应用</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default FootnoteSettingsDialog
