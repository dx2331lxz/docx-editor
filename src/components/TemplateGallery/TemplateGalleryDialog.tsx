import React, { useState } from 'react'

interface TemplateGalleryDialogProps {
  onClose: () => void
  onApply: (htmlContent: string) => void
}

interface Template {
  id: string
  name: string
  color: string
  icon: string
  html: string
}

const TEMPLATES: Template[] = [
  {
    id: 'resume',
    name: '个人简历',
    color: '#3B82F6',
    icon: '👤',
    html: `<h1 style="text-align:center;font-size:24pt;margin-bottom:4px">姓名</h1>
<p style="text-align:center;color:#666">电话：138-xxxx-xxxx　|　邮箱：example@email.com　|　地址：城市</p>
<hr/>
<h2 style="font-size:14pt;border-bottom:2px solid #3B82F6;padding-bottom:4px">教育背景</h2>
<p><strong>XX大学</strong>　计算机科学与技术　本科　2018–2022</p>
<h2 style="font-size:14pt;border-bottom:2px solid #3B82F6;padding-bottom:4px">工作经历</h2>
<p><strong>XX公司</strong>　前端工程师　2022–至今</p>
<ul><li>负责公司核心产品前端开发</li><li>参与架构设计与技术选型</li></ul>
<h2 style="font-size:14pt;border-bottom:2px solid #3B82F6;padding-bottom:4px">技能特长</h2>
<p>React / TypeScript / Node.js / Git</p>`,
  },
  {
    id: 'work-report',
    name: '工作报告',
    color: '#10B981',
    icon: '📊',
    html: `<h1 style="text-align:center;font-size:20pt">工作报告</h1>
<p style="text-align:center;color:#666">汇报人：XXX　日期：${new Date().toLocaleDateString('zh-CN')}</p>
<hr/>
<h2>一、工作总结</h2>
<p>本报告期内，主要完成了以下工作……</p>
<h2>二、详细内容</h2>
<p>1. 项目进展情况<br/>……<br/>2. 遇到的问题<br/>……</p>
<h2>三、下阶段计划</h2>
<p>下一阶段将重点推进以下工作：</p>
<ol><li>继续推进项目开发</li><li>优化现有流程</li><li>加强团队协作</li></ol>
<h2>四、结论</h2>
<p>综上所述，本报告期工作基本达成预期目标，请领导审阅。</p>`,
  },
  {
    id: 'contract',
    name: '合同协议',
    color: '#8B5CF6',
    icon: '📋',
    html: `<h1 style="text-align:center;font-size:20pt">合同协议书</h1>
<p style="text-align:center">合同编号：______</p>
<hr/>
<p><strong>甲方：</strong>____________________　（以下简称"甲方"）</p>
<p><strong>乙方：</strong>____________________　（以下简称"乙方"）</p>
<p>根据国家有关法律法规，甲乙双方经协商一致，签订本合同，条款如下：</p>
<h2>第一条　合同内容</h2>
<p>……</p>
<h2>第二条　权利与义务</h2>
<p>甲方权利：……<br/>乙方义务：……</p>
<h2>第三条　违约责任</h2>
<p>……</p>
<h2>第四条　其他条款</h2>
<p>……</p>
<br/>
<p>甲方签字：________________　日期：______</p>
<p>乙方签字：________________　日期：______</p>`,
  },
  {
    id: 'business-letter',
    name: '商务信函',
    color: '#F59E0B',
    icon: '✉️',
    html: `<p style="text-align:right">${new Date().toLocaleDateString('zh-CN')}</p>
<br/>
<p><strong>收件人：</strong>____________________</p>
<p><strong>单位：</strong>____________________</p>
<br/>
<p>尊敬的____________________：</p>
<br/>
<p>　　您好！感谢您在百忙之中阅读此函。</p>
<br/>
<p>　　（正文内容）……</p>
<br/>
<p>　　如有任何问题，欢迎随时与我们联系。感谢您的支持与合作！</p>
<br/>
<p style="text-align:right">此致</p>
<p style="text-align:right">敬礼</p>
<br/>
<p style="text-align:right">发件人：____________________</p>
<p style="text-align:right">职位：____________________</p>
<p style="text-align:right">联系方式：____________________</p>`,
  },
  {
    id: 'meeting-minutes',
    name: '会议纪要',
    color: '#EF4444',
    icon: '📝',
    html: `<h1 style="text-align:center;font-size:18pt">会议纪要</h1>
<hr/>
<p><strong>会议主题：</strong>____________________</p>
<p><strong>会议时间：</strong>${new Date().toLocaleDateString('zh-CN')}</p>
<p><strong>会议地点：</strong>____________________</p>
<p><strong>主持人：</strong>____________________</p>
<p><strong>参会人员：</strong>____________________</p>
<hr/>
<h2>一、会议议程</h2>
<ol><li>议题一</li><li>议题二</li><li>议题三</li></ol>
<h2>二、讨论内容</h2>
<p>……</p>
<h2>三、决议事项</h2>
<ol><li>决定……负责人：____　完成时间：____</li><li>决定……负责人：____　完成时间：____</li></ol>
<h2>四、其他事项</h2>
<p>……</p>
<br/>
<p style="text-align:right">记录人：____________________</p>`,
  },
  {
    id: 'project-plan',
    name: '项目计划书',
    color: '#06B6D4',
    icon: '🗂️',
    html: `<h1 style="text-align:center;font-size:20pt">项目计划书</h1>
<p style="text-align:center;color:#666">项目名称：____________________</p>
<hr/>
<h2>一、项目概述</h2>
<p>……</p>
<h2>二、项目目标</h2>
<ul><li>目标一：……</li><li>目标二：……</li><li>目标三：……</li></ul>
<h2>三、实施计划</h2>
<table border="1" style="width:100%;border-collapse:collapse">
<tr style="background:#f0f0f0"><th>阶段</th><th>任务</th><th>时间</th><th>负责人</th></tr>
<tr><td>第一阶段</td><td>需求分析</td><td>第1-2周</td><td>____</td></tr>
<tr><td>第二阶段</td><td>设计开发</td><td>第3-8周</td><td>____</td></tr>
<tr><td>第三阶段</td><td>测试上线</td><td>第9-10周</td><td>____</td></tr>
</table>
<h2>四、资源需求</h2>
<p>人力资源：……<br/>物料资源：……<br/>预算：……</p>`,
  },
  {
    id: 'notice',
    name: '通知公告',
    color: '#84CC16',
    icon: '📢',
    html: `<h1 style="text-align:center;font-size:20pt;letter-spacing:2px">通　知</h1>
<hr/>
<p>各部门/相关人员：</p>
<br/>
<p>　　（通知内容）……</p>
<br/>
<p>　　请各相关部门认真遵照执行，如有疑问请及时联系。</p>
<br/>
<p style="text-align:right">____________________</p>
<p style="text-align:right">${new Date().toLocaleDateString('zh-CN')}</p>`,
  },
  {
    id: 'academic-paper',
    name: '学术论文',
    color: '#6366F1',
    icon: '🎓',
    html: `<h1 style="text-align:center;font-size:18pt">论文题目</h1>
<p style="text-align:center">作者：____________________　单位：____________________</p>
<hr/>
<h2>摘　要</h2>
<p>本文研究了……通过……方法，得出……结论。关键词：关键词1；关键词2；关键词3</p>
<h2>1　引言</h2>
<p>……背景介绍……研究意义……</p>
<h2>2　研究方法</h2>
<p>……</p>
<h2>3　实验结果</h2>
<p>……</p>
<h2>4　讨论</h2>
<p>……</p>
<h2>5　结论</h2>
<p>……</p>
<h2>参考文献</h2>
<ol>
<li>[作者]. [题名][J]. [期刊名], [年份], [卷(期)]: [页码].</li>
<li>[作者]. [书名][M]. [出版地]: [出版社], [年份].</li>
</ol>`,
  },
]

const TemplateGalleryDialog: React.FC<TemplateGalleryDialogProps> = ({ onClose, onApply }) => {
  const [selected, setSelected] = useState<string | null>(null)

  const handleApply = () => {
    const tpl = TEMPLATES.find(t => t.id === selected)
    if (tpl) onApply(tpl.html)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-2xl w-[680px] max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-600 to-cyan-600 rounded-t-lg">
          <h2 className="text-white font-semibold text-base">📄 模板库</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-lg font-bold">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-4 gap-3">
            {TEMPLATES.map(tpl => (
              <div
                key={tpl.id}
                onClick={() => setSelected(tpl.id)}
                className={`cursor-pointer rounded-lg border-2 overflow-hidden transition-all
                  ${selected === tpl.id ? 'border-blue-500 shadow-md scale-105' : 'border-gray-200 hover:border-gray-400'}`}
              >
                <div
                  className="flex flex-col items-center justify-center h-24 text-white text-2xl font-bold"
                  style={{ background: tpl.color }}
                >
                  <span className="text-3xl mb-1">{tpl.icon}</span>
                </div>
                <div className="px-2 py-1.5 text-center">
                  <p className="text-sm font-medium text-gray-700 truncate">{tpl.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center px-4 py-3 border-t bg-gray-50 rounded-b-lg">
          <span className="text-sm text-gray-500">
            {selected ? `已选择：${TEMPLATES.find(t => t.id === selected)?.name}` : '请选择一个模板'}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100">取消</button>
            <button
              onClick={handleApply}
              disabled={!selected}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              应用模板
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TemplateGalleryDialog
