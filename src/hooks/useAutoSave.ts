/**
 * useAutoSave — persists editor content to localStorage every 30s.
 * Returns: { lastSaved, draftInfo, restoreDraft, dismissDraft, saveNow }
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'

const STORAGE_KEY = 'docx-editor-autosave'
const INTERVAL_MS = 30_000

interface DraftMeta {
  content: object
  savedAt: string  // ISO string
}

export interface AutoSaveState {
  lastSaved: Date | null
  draftInfo: { savedAt: Date } | null
  restoreDraft: () => void
  dismissDraft: () => void
  saveNow: () => void
}

export function useAutoSave(editor: Editor | null): AutoSaveState {
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [draftInfo, setDraftInfo] = useState<{ savedAt: Date } | null>(null)
  const hasRestoredRef = useRef(false)

  // Check for existing draft on mount
  useEffect(() => {
    if (hasRestoredRef.current) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const meta: DraftMeta = JSON.parse(raw)
        setDraftInfo({ savedAt: new Date(meta.savedAt) })
      }
    } catch { /* ignore */ }
  }, [])

  const saveNow = useCallback(() => {
    if (!editor) return
    try {
      const content = editor.getJSON()
      const meta: DraftMeta = { content, savedAt: new Date().toISOString() }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(meta))
      setLastSaved(new Date())
    } catch { /* ignore */ }
  }, [editor])

  // Auto-save interval
  useEffect(() => {
    const id = setInterval(saveNow, INTERVAL_MS)
    return () => clearInterval(id)
  }, [saveNow])

  // Ctrl+S manual save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        saveNow()
        // Flash a toast — dispatch custom event
        document.dispatchEvent(new CustomEvent('autosave:manualsave'))
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [saveNow])

  const restoreDraft = useCallback(() => {
    if (!editor) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const meta: DraftMeta = JSON.parse(raw)
        editor.commands.setContent(meta.content)
        setDraftInfo(null)
        hasRestoredRef.current = true
      }
    } catch { /* ignore */ }
  }, [editor])

  const dismissDraft = useCallback(() => {
    setDraftInfo(null)
    hasRestoredRef.current = true
  }, [])

  return { lastSaved, draftInfo, restoreDraft, dismissDraft, saveNow }
}
