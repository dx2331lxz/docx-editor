import { useState, useEffect, useRef } from 'react'
import { Editor } from '@tiptap/react'

interface Props {
  editor: Editor | null
  onClose: () => void
}

interface DocAnalysis {
  charCount: number
  wordCount: number
  paraCount: number
  sentenceCount: number
  headings: { level: number; text: string }[]
  topWords: { word: string; count: number }[]
  avgWordsPerPara: number
  longestPara: number
  readingMinutes: number
}

function analyzeDoc(editor: Editor | null): DocAnalysis {
  if (!editor) return { charCount: 0, wordCount: 0, paraCount: 0, sentenceCount: 0, headings: [], topWords: [], avgWordsPerPara: 0, longestPara: 0, readingMinutes: 0 }

  const text = editor.state.doc.textContent
  const headings: { level: number; text: string }[] = []
  const paragraphs: string[] = []

  editor.state.doc.descendants(node => {
    if (node.type.name === 'heading') {
      headings.push({ level: node.attrs.level, text: node.textContent })
    }
    if (node.type.name === 'paragraph' && node.textContent.trim()) {
      paragraphs.push(node.textContent.trim())
    }
  })

  const charCount = text.length
  // Chinese word count: each CJK char = 1 word; latin words by spaces
  const cjkCount = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const latinWords = text.replace(/[\u4e00-\u9fff]/g, '').trim().split(/\s+/).filter(w => w.length > 1).length
  const wordCount = cjkCount + latinWords
  const paraCount = paragraphs.length
  const sentenceCount = (text.match(/[。！？!?\.]+/g) || []).length

  // Top words (CJK bigrams)
  const wordFreq: Record<string, number> = {}
  const cjkOnly = text.replace(/[^\u4e00-\u9fff]/g, '')
  for (let i = 0; i < cjkOnly.length - 1; i++) {
    const bigram = cjkOnly.slice(i, i + 2)
    wordFreq[bigram] = (wordFreq[bigram] || 0) + 1
  }
  const stopBigrams = new Set(['的是', '是的', '了的', '在的', '和的', '的在', '的了', '一个', '这个', '那个'])
  const topWords = Object.entries(wordFreq)
    .filter(([w]) => !stopBigrams.has(w))
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }))

  const paraLengths = paragraphs.map(p => p.length)
  const avgWordsPerPara = paraCount > 0 ? Math.round(wordCount / paraCount) : 0
  const longestPara = paraLengths.length > 0 ? Math.max(...paraLengths) : 0
  const readingMinutes = Math.max(1, Math.round(wordCount / 300))

  return { charCount, wordCount, paraCount, sentenceCount, headings, topWords, avgWordsPerPara, longestPara, readingMinutes }
}

function MiniBarChart({ data, maxVal }: { data: { label: string; value: number }[]; maxVal: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {data.map(d => (
        <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 60, fontSize: 11, color: '#6b7280', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
          <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 3, height: 16, overflow: 'hidden' }}>
            <div style={{ width: `${maxVal > 0 ? (d.value / maxVal) * 100 : 0}%`, background: '#3b82f6', height: '100%', borderRadius: 3, minWidth: d.value > 0 ? 2 : 0, transition: 'width 0.3s' }} />
          </div>
          <span style={{ width: 28, fontSize: 11, color: '#374151', textAlign: 'right', flexShrink: 0 }}>{d.value}</span>
        </div>
      ))}
    </div>
  )
}

function HeadingTree({ headings }: { headings: { level: number; text: string }[] }) {
  if (headings.length === 0) return <div style={{ color: '#9ca3af', fontSize: 12, padding: 8 }}>暂无标题</div>
  return (
    <div style={{ maxHeight: 180, overflowY: 'auto' }}>
      {headings.map((h, i) => (
        <div key={i} style={{
          paddingLeft: (h.level - 1) * 14 + 8,
          paddingTop: 3, paddingBottom: 3,
          fontSize: 12,
          color: h.level === 1 ? '#1e40af' : h.level === 2 ? '#1d4ed8' : '#374151',
          fontWeight: h.level <= 2 ? 600 : 400,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{ fontSize: 9, color: '#94a3b8' }}>{'─'.repeat(h.level - 1) || '●'}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>H{h.level} {h.text}</span>
        </div>
      ))}
    </div>
  )
}

export default function DocStatsDashboard({ editor, onClose }: Props) {
  const [analysis, setAnalysis] = useState<DocAnalysis>(() => analyzeDoc(editor))
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    setAnalysis(analyzeDoc(editor))
  }, [editor])

  // Draw donut chart for content distribution
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { charCount, headings, paraCount } = analysis
    const headingChars = headings.reduce((s, h) => s + h.text.length, 0)
    const bodyChars = Math.max(0, charCount - headingChars)
    const total = charCount || 1
    const data = [
      { value: headingChars, color: '#3b82f6', label: '标题' },
      { value: bodyChars, color: '#10b981', label: '正文' },
    ]
    const cx = 60, cy = 60, r = 50, inner = 28
    let angle = -Math.PI / 2
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    data.forEach(d => {
      const sweep = (d.value / total) * 2 * Math.PI
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, angle, angle + sweep)
      ctx.closePath()
      ctx.fillStyle = d.color
      ctx.fill()
      angle += sweep
    })
    // Inner hole
    ctx.beginPath()
    ctx.arc(cx, cy, inner, 0, 2 * Math.PI)
    ctx.fillStyle = '#fff'
    ctx.fill()
    // Center text
    ctx.fillStyle = '#1e293b'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(charCount), cx, cy - 6)
    ctx.font = '10px sans-serif'
    ctx.fillStyle = '#6b7280'
    ctx.fillText('字符', cx, cy + 10)
  }, [analysis])

  const stats = [
    { label: '总字数', value: analysis.wordCount, icon: '📝' },
    { label: '总字符', value: analysis.charCount, icon: '🔤' },
    { label: '段落数', value: analysis.paraCount, icon: '¶' },
    { label: '句子数', value: analysis.sentenceCount, icon: '💬' },
    { label: '标题数', value: analysis.headings.length, icon: '📌' },
    { label: '阅读时间', value: `${analysis.readingMinutes} 分钟`, icon: '⏱' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 10, width: 660, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#1e293b' }}>📊 文档分析</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setAnalysis(analyzeDoc(editor))}
              style={{ padding: '4px 12px', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 12, background: '#f9fafb' }}>
              🔄 刷新
            </button>
            <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {/* Stats cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Donut chart */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>内容构成</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <canvas ref={canvasRef} width={120} height={120} />
                <div style={{ flex: 1 }}>
                  {[
                    { label: '标题', color: '#3b82f6' },
                    { label: '正文', color: '#10b981' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 12 }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                      <span style={{ color: '#374151' }}>{item.label}</span>
                    </div>
                  ))}
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>
                    均段字数：{analysis.avgWordsPerPara}<br />
                    最长段落：{analysis.longestPara} 字
                  </div>
                </div>
              </div>
            </div>

            {/* Top words */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>高频词（双字）</div>
              {analysis.topWords.length === 0
                ? <div style={{ color: '#9ca3af', fontSize: 12 }}>需要更多中文内容</div>
                : <MiniBarChart data={analysis.topWords.map(w => ({ label: w.word, value: w.count }))} maxVal={analysis.topWords[0]?.count || 1} />
              }
            </div>

            {/* Heading tree */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>标题层级结构</div>
              <HeadingTree headings={analysis.headings} />
            </div>
          </div>
        </div>

        <div style={{ padding: '10px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '6px 20px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>关闭</button>
        </div>
      </div>
    </div>
  )
}
