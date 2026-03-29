/**
 * SaveToast — brief "已保存：{fileName}" notification that fades out.
 * Listens to 'autosave:manualsave' CustomEvent with detail { fileName, isAuto }.
 * Auto-save variant is smaller and more transparent.
 */
import React, { useEffect, useState } from 'react'
import { CheckCircle } from 'lucide-react'

interface ToastDetail {
  fileName?: string
  isAuto?: boolean
}

interface ToastState {
  visible: boolean
  fileName: string
  isAuto: boolean
}

const SaveToast: React.FC = () => {
  const [toast, setToast] = useState<ToastState>({ visible: false, fileName: '', isAuto: false })

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const handler = (e: Event) => {
      const detail: ToastDetail = (e as CustomEvent<ToastDetail>).detail ?? {}
      setToast({ visible: true, fileName: detail.fileName ?? '', isAuto: detail.isAuto ?? false })
      clearTimeout(timer)
      timer = setTimeout(() => setToast(s => ({ ...s, visible: false })), 2000)
    }
    document.addEventListener('autosave:manualsave', handler)
    return () => {
      document.removeEventListener('autosave:manualsave', handler)
      clearTimeout(timer)
    }
  }, [])

  if (!toast.visible) return null

  return (
    <div
      className={`fixed z-[9998] flex items-center gap-2 rounded-lg shadow-xl ${
        toast.isAuto ? 'bottom-10 right-6 text-xs px-3 py-1.5' : 'bottom-10 right-6 text-sm px-4 py-2'
      }`}
      style={{
        background: 'rgba(10, 14, 30, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(0, 212, 255, 0.25)',
        color: '#e0e8ff',
        opacity: toast.isAuto ? 0.75 : 1,
        animation: 'fadeInUp 0.2s ease',
      }}
    >
      <CheckCircle size={toast.isAuto ? 12 : 14} style={{ color: '#4ade80', flexShrink: 0 }} />
      <span>{toast.fileName ? `已保存：${toast.fileName}` : '已保存'}</span>
    </div>
  )
}

export default SaveToast
