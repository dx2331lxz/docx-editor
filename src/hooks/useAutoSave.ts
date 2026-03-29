import { API } from '../lib/apiRoutes'
/**
 * useAutoSave — persists editor content to localStorage every 30s.
 * Also syncs to local server if cloud sync is enabled.
 * Returns: { lastSaved, draftInfo, restoreDraft, dismissDraft, saveNow }
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { loadCloudSyncConfig, pushToLocalServer } from '../components/CloudSync/CloudSyncDialog'

const STORAGE_KEY = 'docx-editor-autosave'
const EXIT_FLAG_KEY = 'docx-editor-normal-exit'
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

  // Check for existing draft on mount — only show if previous exit was abnormal
  useEffect(() => {
    if (hasRestoredRef.current) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const wasNormalExit = localStorage.getItem(EXIT_FLAG_KEY) === 'true'
      // Clear the flag so next load starts fresh
      localStorage.removeItem(EXIT_FLAG_KEY)
      if (raw && !wasNormalExit) {
        const meta: DraftMeta = JSON.parse(raw)
        setDraftInfo({ savedAt: new Date(meta.savedAt) })
      }
    } catch { /* ignore */ }
  }, [])

  // Mark normal exit on page unload
  useEffect(() => {
    const handler = () => {
      localStorage.setItem(EXIT_FLAG_KEY, 'true')
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  const saveNow = useCallback(() => {
    if (!editor) return
    try {
      const content = editor.getJSON()
      const meta: DraftMeta = { content, savedAt: new Date().toISOString() }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(meta))
      setLastSaved(new Date())
      // Cloud sync if enabled
      const cfg = loadCloudSyncConfig()
      if (cfg.enabled && cfg.provider === 'local') {
        pushToLocalServer(cfg.docId, content, { title: 'docx-editor' }).catch(() => {/* silent fail */})
      }
      // Backend doc storage (always attempt, silent fail)
      fetch(API.docsLegacy, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId: 'default', content, meta: { title: 'docx-editor' } }),
      }).catch(() => {/* silent fail */})
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
