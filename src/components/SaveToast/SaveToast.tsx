/**
 * SaveToast — brief "已保存" notification that fades out.
 * Appears when Ctrl+S is pressed.
 */
import React, { useEffect, useState } from 'react'
import { CheckCircle } from 'lucide-react'

const SaveToast: React.FC = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const handler = () => {
      setVisible(true)
      timer = setTimeout(() => setVisible(false), 2000)
    }
    document.addEventListener('autosave:manualsave', handler)
    return () => {
      document.removeEventListener('autosave:manualsave', handler)
      clearTimeout(timer)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed bottom-10 right-6 z-[9998] flex items-center gap-2 bg-gray-800 text-white text-sm px-4 py-2 rounded-lg shadow-xl"
      style={{ animation: 'fadeInUp 0.2s ease' }}
    >
      <CheckCircle size={14} className="text-green-400" />
      已保存
    </div>
  )
}

export default SaveToast
