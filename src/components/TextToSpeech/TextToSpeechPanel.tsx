import { useState, useEffect, useRef, useCallback } from 'react'
import { Editor } from '@tiptap/react'

interface Props {
  editor: Editor | null
  onClose: () => void
  initialText?: string
}

type SpeechState = 'idle' | 'playing' | 'paused'

export default function TextToSpeechPanel({ editor, onClose, initialText }: Props) {
  const [text, setText] = useState(initialText || '')
  const [state, setState] = useState<SpeechState>('idle')
  const [rate, setRate] = useState(1.0)
  const [pitch, setPitch] = useState(1.0)
  const [volume, setVolume] = useState(1.0)
  const [lang, setLang] = useState('zh-CN')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<string>('')
  const [currentWord, setCurrentWord] = useState('')
  const [supported] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window)
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Load voices
  useEffect(() => {
    if (!supported) return
    const load = () => {
      const v = window.speechSynthesis.getVoices()
      setVoices(v)
      const zhVoice = v.find(vv => vv.lang.startsWith('zh'))
      if (zhVoice) setSelectedVoice(zhVoice.name)
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => { window.speechSynthesis.onvoiceschanged = null }
  }, [supported])

  // Populate text from editor if no initial text
  useEffect(() => {
    if (!initialText && editor) {
      const sel = editor.state.selection
      if (!sel.empty) {
        setText(editor.state.doc.textBetween(sel.from, sel.to, '\n'))
      } else {
        setText(editor.state.doc.textContent)
      }
    }
  }, [editor, initialText])

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel()
    setState('idle')
    setCurrentWord('')
  }, [supported])

  useEffect(() => {
    return () => { if (supported) window.speechSynthesis.cancel() }
  }, [supported])

  function play() {
    if (!supported || !text) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = rate
    utter.pitch = pitch
    utter.volume = volume
    utter.lang = lang
    const voice = voices.find(v => v.name === selectedVoice)
    if (voice) utter.voice = voice
    utter.onboundary = (e) => {
      if (e.name === 'word') {
        const word = text.slice(e.charIndex, e.charIndex + e.charLength)
        setCurrentWord(word)
      }
    }
    utter.onend = () => { setState('idle'); setCurrentWord('') }
    utter.onerror = () => { setState('idle'); setCurrentWord('') }
    utterRef.current = utter
    window.speechSynthesis.speak(utter)
    setState('playing')
  }

  function pause() {
    if (!supported) return
    window.speechSynthesis.pause()
    setState('paused')
  }

  function resume() {
    if (!supported) return
    window.speechSynthesis.resume()
    setState('playing')
  }

  const LANGS = [
    { value: 'zh-CN', label: '普通话（中国大陆）' },
    { value: 'zh-TW', label: '国语（台湾）' },
    { value: 'zh-HK', label: '粤语（香港）' },
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'ja-JP', label: '日本語' },
  ]

  const filteredVoices = voices.filter(v => v.lang.startsWith(lang.split('-')[0]))

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 10, width: 500, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#1e293b' }}>🔊 朗读文档</h2>
          <button onClick={() => { stop(); onClose() }} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        {!supported && (
          <div style={{ padding: 20, background: '#fef3c7', color: '#92400e', fontSize: 13 }}>
            ⚠️ 您的浏览器不支持 Web Speech API，请使用 Chrome 或 Edge 浏览器。
          </div>
        )}

        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {/* Text area */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>朗读内容</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={5}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
              placeholder="输入或从编辑器获取文字..."
            />
            {currentWord && (
              <div style={{ marginTop: 4, fontSize: 12, color: '#2563eb' }}>
                正在朗读：<strong style={{ background: '#dbeafe', padding: '1px 4px', borderRadius: 3 }}>{currentWord}</strong>
              </div>
            )}
          </div>

          {/* Language & voice */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>语言</label>
              <select value={lang} onChange={e => setLang(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }}>
                {LANGS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>语音</label>
              <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }}>
                {filteredVoices.length === 0
                  ? <option value="">（默认）</option>
                  : filteredVoices.map(v => <option key={v.name} value={v.name}>{v.name}</option>)
                }
              </select>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              { label: `语速 ${rate.toFixed(1)}x`, value: rate, min: 0.5, max: 2, step: 0.1, setter: setRate },
              { label: `音调 ${pitch.toFixed(1)}`, value: pitch, min: 0, max: 2, step: 0.1, setter: setPitch },
              { label: `音量 ${Math.round(volume * 100)}%`, value: volume, min: 0, max: 1, step: 0.1, setter: setVolume },
            ].map(ctrl => (
              <div key={ctrl.label}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{ctrl.label}</label>
                <input type="range" min={ctrl.min} max={ctrl.max} step={ctrl.step} value={ctrl.value}
                  onChange={e => ctrl.setter(parseFloat(e.target.value))}
                  style={{ width: '100%' }} />
              </div>
            ))}
          </div>

          {/* Playback buttons */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {state === 'idle' && (
              <button onClick={play} disabled={!text || !supported}
                style={{ padding: '10px 32px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15, fontWeight: 600 }}>
                ▶ 播放
              </button>
            )}
            {state === 'playing' && (
              <>
                <button onClick={pause}
                  style={{ padding: '10px 24px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15 }}>
                  ⏸ 暂停
                </button>
                <button onClick={stop}
                  style={{ padding: '10px 24px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15 }}>
                  ⏹ 停止
                </button>
              </>
            )}
            {state === 'paused' && (
              <>
                <button onClick={resume}
                  style={{ padding: '10px 24px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15 }}>
                  ▶ 继续
                </button>
                <button onClick={stop}
                  style={{ padding: '10px 24px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15 }}>
                  ⏹ 停止
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: '10px 20px', borderTop: '1px solid #e5e7eb', fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
          使用浏览器内置 Web Speech API · 朗读效果因浏览器/系统而异
        </div>
      </div>
    </div>
  )
}
