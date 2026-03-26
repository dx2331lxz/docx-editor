/**
 * TemplateDialog — 文档模板系统
 * 预设模板：简历、报告、信函、论文、合同、通知
 * 支持保存自定义模板，预览+应用
 */
import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'

interface TemplateDialogProps {
  editor: Editor | null
  onClose: () => void
}

interface DocTemplate {
  id: string
  name: string
  category: string
  icon: string
  desc: string
  html: string
  custom?: boolean
}

const BUILTIN_TEMPLATES: DocTemplate[] = [
  {
    id: 'resume',
    name: '个人简历',
    category: '求职',
    icon: '👤',
    desc: '标准求职简历模板，包含基本信息、教育背景、工作经历',
    html: `<h1 style="text-align:center;font-size:22px;margin-bottom:4px;">张 三</h1>
<p style="text-align:center;font-size:12px;color:#6b7280;">📱 138-0000-0000 &nbsp;|&nbsp; ✉ zhangsan@email.com &nbsp;|&nbsp; 📍 北京市</p>
<hr style="margin:12px 0;"/>
<h2 style="font-size:15px;color:#1d4ed8;border-bottom:2px solid #1d4ed8;padding-bottom:4px;">教育背景</h2>
<p><strong>某某大学</strong> — 计算机科学与技术（本科） <span style="float:right;color:#6b7280;">2018 - 2022</span></p>
<h2 style="font-size:15px;color:#1d4ed8;border-bottom:2px solid #1d4ed8;padding-bottom:4px;margin-top:16px;">工作经历</h2>
<p><strong>某某科技有限公司</strong> — 软件工程师 <span style="float:right;color:#6b7280;">2022.07 - 至今</span></p>
<ul style="margin-left:20px;"><li>负责前端开发工作，使用 React + TypeScript</li><li>参与项目架构设计与技术选型</li></ul>
<h2 style="font-size:15px;color:#1d4ed8;border-bottom:2px solid #1d4ed8;padding-bottom:4px;margin-top:16px;">技能特长</h2>
<p>JavaScript / TypeScript / React / Node.js / Git</p>`,
  },
  {
    id: 'report',
    name: '工作报告',
    category: '商务',
    icon: '📊',
    desc: '正式工作报告模板，含摘要、正文、结论',
    html: `<h1 style="text-align:center;font-size:20px;">2024年度工作总结报告</h1>
<p style="text-align:center;color:#6b7280;font-size:12px;">撰写人：[姓名] &nbsp;|&nbsp; 部门：[部门] &nbsp;|&nbsp; 日期：${new Date().toLocaleDateString('zh-CN')}</p>
<h2 style="font-size:15px;margin-top:20px;">一、工作概述</h2>
<p>本年度，本部门在公司领导的正确带领下，圆满完成了各项工作目标……</p>
<h2 style="font-size:15px;margin-top:16px;">二、主要工作成绩</h2>
<p>1. 完成了XXX项目的开发和上线，提升了业务效率30%。</p>
<p>2. 优化了系统架构，降低了服务器成本15%。</p>
<h2 style="font-size:15px;margin-top:16px;">三、存在问题</h2>
<p>部分项目进度有所延误，需在下一阶段加以改进……</p>
<h2 style="font-size:15px;margin-top:16px;">四、下年度工作计划</h2>
<p>继续推进数字化转型，重点攻关核心技术难题……</p>`,
  },
  {
    id: 'letter',
    name: '商务信函',
    category: '商务',
    icon: '✉',
    desc: '标准商务信函格式',
    html: `<p style="text-align:right;color:#6b7280;font-size:13px;">${new Date().toLocaleDateString('zh-CN')}</p>
<p style="margin-top:16px;"><strong>[收件人姓名]</strong><br/>[职位]<br/>[公司名称]<br/>[地址]</p>
<p style="margin-top:16px;">尊敬的 [收件人姓名]：</p>
<p style="margin-top:12px;line-height:1.8;">您好！</p>
<p style="line-height:1.8;">感谢您抽出宝贵时间阅读此函。我们就 [主题] 一事，特致函说明如下……</p>
<p style="line-height:1.8;">[正文内容]</p>
<p style="margin-top:16px;line-height:1.8;">如有任何疑问，请随时与我们联系。期待您的回复。</p>
<p style="margin-top:24px;">此致</p>
<p style="margin-top:8px;">敬礼</p>
<p style="margin-top:16px;">[署名]<br/>[职位]<br/>[公司]<br/>[联系方式]</p>`,
  },
  {
    id: 'thesis',
    name: '学术论文',
    category: '学术',
    icon: '🎓',
    desc: '标准学术论文格式，含摘要、关键词、正文',
    html: `<h1 style="text-align:center;font-size:18px;font-weight:bold;">[论文题目]</h1>
<p style="text-align:center;font-size:13px;margin-top:4px;">[作者姓名]<sup>1</sup>，[合作作者]<sup>2</sup></p>
<p style="text-align:center;font-size:12px;color:#6b7280;">（1. [单位名称]; 2. [单位名称]）</p>
<div style="margin:16px 0;padding:12px;background:#f9fafb;border-left:3px solid #374151;">
<p><strong>摘要：</strong>本文研究了……通过实验验证……结果表明……</p>
<p style="margin-top:8px;"><strong>关键词：</strong>关键词1；关键词2；关键词3；关键词4</p>
</div>
<h2 style="font-size:15px;margin-top:20px;">1 引言</h2>
<p style="text-indent:2em;line-height:1.8;">随着技术的不断发展，[研究背景]。本文旨在……</p>
<h2 style="font-size:15px;margin-top:16px;">2 研究方法</h2>
<p style="text-indent:2em;line-height:1.8;">本研究采用……方法，数据来源于……</p>
<h2 style="font-size:15px;margin-top:16px;">3 实验结果</h2>
<p style="text-indent:2em;line-height:1.8;">实验结果如下表所示……</p>
<h2 style="font-size:15px;margin-top:16px;">4 结论</h2>
<p style="text-indent:2em;line-height:1.8;">本文提出了……，实验证明……</p>
<h2 style="font-size:15px;margin-top:16px;">参考文献</h2>
<p style="font-size:13px;">[1] 作者. 文章题目[J]. 期刊名, 年份, 卷(期): 页码.</p>`,
  },
  {
    id: 'contract',
    name: '合同协议',
    category: '法务',
    icon: '📝',
    desc: '通用合同模板，含甲乙双方、条款、签署',
    html: `<h1 style="text-align:center;font-size:18px;font-weight:bold;">合 同 协 议 书</h1>
<p style="text-align:center;color:#6b7280;font-size:12px;">合同编号：[XXXX-XXXX-XX]</p>
<p style="margin-top:16px;line-height:2;">甲方：<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>（以下简称"甲方"）</p>
<p style="line-height:2;">乙方：<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>（以下简称"乙方"）</p>
<p style="margin-top:12px;line-height:1.8;">根据《中华人民共和国合同法》及相关法律法规，经甲乙双方协商一致，订立本合同。</p>
<h2 style="font-size:14px;margin-top:16px;">第一条 合同内容</h2>
<p style="line-height:1.8;">1.1 [具体内容]</p>
<h2 style="font-size:14px;margin-top:12px;">第二条 合同金额及支付方式</h2>
<p style="line-height:1.8;">2.1 合同总金额为人民币 [金额] 元（大写：[大写金额]）。</p>
<h2 style="font-size:14px;margin-top:12px;">第三条 违约责任</h2>
<p style="line-height:1.8;">3.1 如一方违约，需承担违约金，金额为合同总价的 [X]%。</p>
<h2 style="font-size:14px;margin-top:12px;">第四条 争议解决</h2>
<p style="line-height:1.8;">4.1 本合同适用中国法律，争议由双方协商解决。</p>
<div style="margin-top:32px;display:flex;justify-content:space-between;">
<div style="width:45%;">
<p>甲方（盖章）：</p>
<p style="margin-top:24px;">授权代表签字：____________</p>
<p>日期：________________</p>
</div>
<div style="width:45%;">
<p>乙方（盖章）：</p>
<p style="margin-top:24px;">授权代表签字：____________</p>
<p>日期：________________</p>
</div>
</div>`,
  },
  {
    id: 'notice',
    name: '通知公告',
    category: '行政',
    icon: '📢',
    desc: '正式通知/公告模板',
    html: `<h1 style="text-align:center;font-size:22px;font-weight:bold;color:#dc2626;letter-spacing:4px;">通 知</h1>
<p style="margin-top:16px;line-height:2;">各部门、全体员工：</p>
<p style="text-indent:2em;line-height:1.8;margin-top:8px;">[通知内容。根据公司安排，定于XXXX年XX月XX日（星期X），开展XXXX活动/会议。现将有关事项通知如下：]</p>
<p style="text-indent:2em;line-height:1.8;margin-top:8px;">一、[主要事项]</p>
<p style="text-indent:2em;line-height:1.8;">二、[注意事项]</p>
<p style="text-indent:2em;line-height:1.8;">三、[其他要求]</p>
<p style="text-indent:2em;line-height:1.8;margin-top:16px;">请各部门认真组织落实，如有疑问请及时联系 [联系人] （电话：[电话]）。</p>
<p style="text-align:right;margin-top:32px;">[发文单位]</p>
<p style="text-align:right;">${new Date().toLocaleDateString('zh-CN')}</p>`,
  },
]

const STORAGE_KEY = 'docx-editor-custom-templates'

const TemplateDialog: React.FC<TemplateDialogProps> = ({ editor, onClose }) => {
  const [customTemplates, setCustomTemplates] = useState<DocTemplate[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [selected, setSelected] = useState<string | null>(null)
  const [tab, setTab] = useState<'builtin' | 'custom'>('builtin')
  const [saveName, setSaveName] = useState('')
  const [showSave, setShowSave] = useState(false)
  const [filterCat, setFilterCat] = useState('全部')

  const allTemplates = tab === 'builtin' ? BUILTIN_TEMPLATES : customTemplates
  const cats = ['全部', ...Array.from(new Set(BUILTIN_TEMPLATES.map(t => t.category)))]
  const filtered = filterCat === '全部' ? allTemplates : allTemplates.filter(t => t.category === filterCat)

  const selectedTpl = [...BUILTIN_TEMPLATES, ...customTemplates].find(t => t.id === selected)

  const applyTemplate = () => {
    if (!editor || !selectedTpl) return
    if (confirm('应用模板将替换当前文档内容，确定继续？')) {
      editor.commands.setContent(selectedTpl.html)
      onClose()
    }
  }

  const saveAsTemplate = () => {
    if (!editor || !saveName.trim()) return
    const html = editor.getHTML()
    const tpl: DocTemplate = {
      id: `custom-${Date.now()}`,
      name: saveName.trim(),
      category: '自定义',
      icon: '📌',
      desc: `自定义模板：${saveName.trim()}`,
      html,
      custom: true,
    }
    const updated = [...customTemplates, tpl]
    setCustomTemplates(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setSaveName('')
    setShowSave(false)
    setTab('custom')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[700px] flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-base font-semibold">从模板新建</h3>
          <div className="flex items-center gap-2">
            <button className="text-xs px-3 py-1 bg-amber-500 text-white rounded hover:bg-amber-600"
              onClick={() => setShowSave(v => !v)}>
              💾 保存当前为模板
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
        </div>

        {/* Save banner */}
        {showSave && (
          <div className="px-5 py-3 bg-amber-50 border-b flex items-center gap-3">
            <input type="text" value={saveName} onChange={e => setSaveName(e.target.value)}
              placeholder="模板名称" className="flex-1 border border-amber-300 rounded px-2 py-1 text-sm"
              onKeyDown={e => e.key === 'Enter' && saveAsTemplate()} />
            <button className="px-3 py-1 bg-amber-500 text-white rounded text-sm hover:bg-amber-600 disabled:opacity-50"
              onClick={saveAsTemplate} disabled={!saveName.trim()}>保存</button>
            <button className="px-2 py-1 text-gray-500 hover:text-gray-700 text-sm" onClick={() => setShowSave(false)}>取消</button>
          </div>
        )}

        {/* Tabs + filter */}
        <div className="flex items-center border-b bg-gray-50 px-4">
          <div className="flex">
            {(['builtin', 'custom'] as const).map(t => (
              <button key={t}
                className={`px-4 py-2 text-sm border-b-2 ${tab === t ? 'border-blue-500 text-blue-600 bg-white' : 'border-transparent text-gray-500'}`}
                onClick={() => setTab(t)}>
                {t === 'builtin' ? `📋 内置模板 (${BUILTIN_TEMPLATES.length})` : `📌 自定义 (${customTemplates.length})`}
              </button>
            ))}
          </div>
          {tab === 'builtin' && (
            <div className="ml-auto flex gap-1">
              {cats.map(c => (
                <button key={c}
                  className={`px-2 py-0.5 rounded text-xs ${filterCat === c ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
                  onClick={() => setFilterCat(c)}>{c}</button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Template grid */}
          <div className="w-64 border-r overflow-y-auto p-3 space-y-1 flex-shrink-0">
            {filtered.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-8">暂无模板</div>
            ) : filtered.map(tpl => (
              <button key={tpl.id}
                className={`w-full text-left px-3 py-2.5 rounded-lg border-2 transition-all ${selected === tpl.id ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-50 hover:border-gray-200'}`}
                onClick={() => setSelected(tpl.id)}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{tpl.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-800">{tpl.name}</div>
                    <div className="text-xs text-gray-400">{tpl.category}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Preview */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedTpl ? (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{selectedTpl.icon}</span>
                  <div>
                    <div className="text-base font-semibold">{selectedTpl.name}</div>
                    <div className="text-sm text-gray-500">{selectedTpl.desc}</div>
                  </div>
                </div>
                <div className="border rounded-lg p-4 bg-white shadow-sm text-sm leading-relaxed overflow-hidden max-h-80"
                  dangerouslySetInnerHTML={{ __html: selectedTpl.html }} />
                {selectedTpl.custom && (
                  <button className="mt-2 text-xs text-red-500 hover:text-red-700"
                    onClick={() => {
                      const updated = customTemplates.filter(t => t.id !== selectedTpl.id)
                      setCustomTemplates(updated)
                      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
                      setSelected(null)
                    }}>
                    删除此模板
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                选择左侧模板以预览
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t bg-gray-50">
          <button className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
            onClick={onClose}>取消</button>
          <button
            className="px-6 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            onClick={applyTemplate}
            disabled={!selectedTpl}>
            应用模板
          </button>
        </div>
      </div>
    </div>
  )
}

export default TemplateDialog
