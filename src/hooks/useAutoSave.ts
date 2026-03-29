import { API } from '../lib/apiRoutes'
/**
 * useAutoSave — tracks last saved time for StatusBar display.
 * Actual saving is handled by FileManagerSidebar.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'

export interface AutoSaveState {
  lastSaved: Date | null
  saveNow: () => void
}

export function useAutoSave(editor: Editor | null): AutoSaveState {
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const saveNow = useCallback(() => {
    if (!editor) return
    try {
      const content = editor.getJSON()
      // Legacy backend doc storage (silent fail)
      fetch(API.docsLegacy, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId: 'default', content, meta: { title: 'docx-editor' } }),
      }).catch(() => {/* silent fail */})
      setLastSaved(new Date())
    } catch { /* ignore */ }
  }, [editor])

  // Listen for save events from FileManagerSidebar
  useEffect(() => {
    const handler = () => setLastSaved(new Date())
    document.addEventListener('filesave:success', handler)
    return () => document.removeEventListener('filesave:success', handler)
  }, [])

  return { lastSaved, saveNow }
}
