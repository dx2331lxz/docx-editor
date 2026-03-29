import { API, apiUrl } from '../../lib/apiRoutes'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, FilePlus, Save, Trash2,
  FileText, FolderOpen, MoreVertical, Loader2,
} from 'lucide-react'
import type { Editor } from '@tiptap/react'
import { importDocx, exportDocx } from '../../utils/docxHandler'
import type { AIDocument } from '../../types/editor'
import type { PageConfig } from '../PageSetup/PageSetupDialog'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DocFile {
  id: string
  name: string
  size: number
  updatedAt: string
}

interface Props {
  editor: Editor | null
  currentDoc: AIDocument | null
  pageConfig: PageConfig
  /** Called when a document is opened — passes the new docx name/id */
  onDocOpened?: (file: DocFile) => void
  /** Current open file id (to highlight) */
  openFileId?: string | null
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchFiles(): Promise<DocFile[]> {
  const res = await fetch(API.files)
  if (!res.ok) throw new Error('Failed to fetch files')
  return res.json()
}

async function uploadDocx(blob: Blob, name: string): Promise<DocFile> {
  const fd = new FormData()
  fd.append('file', blob, `${name}.docx`)
  fd.append('name', name)
  const res = await fetch(API.files, { method: 'POST', body: fd })
  if (!res.ok) throw new Error('Upload failed')
  return res.json()
}

async function overwriteDocx(id: string, blob: Blob, name: string): Promise<DocFile> {
  // Delete old + upload new with same name intent
  await fetch(`/api/files/${encodeURIComponent(id)}`, { method: 'DELETE' })
  const fd = new FormData()
  fd.append('file', blob, `${name}.docx`)
  fd.append('name', name)
  const res = await fetch(API.files, { method: 'POST', body: fd })
  if (!res.ok) throw new Error('Save failed')
  return res.json()
}

async function renameFile(id: string, name: string): Promise<void> {
  await fetch(`/api/files/${encodeURIComponent(id)}/name`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

async function deleteFile(id: string): Promise<void> {
  await fetch(`/api/files/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDocumentTitle(editor: Editor): string {
  const html = editor.getHTML()
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const h1 = doc.querySelector('h1')
  if (h1?.textContent?.trim()) return h1.textContent.trim().slice(0, 50)
  const text = editor.getText().trim()
  return text ? text.slice(0, 30) : '新文档'
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FileManagerSidebar({
  editor,
  currentDoc,
  pageConfig,
  onDocOpened,
  openFileId,
}: Props) {
  const [collapsed, setCollapsed] = useState(true)
  const [files, setFiles] = useState<DocFile[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [currentFileId, setCurrentFileId] = useState<string | null>(openFileId ?? null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveDialogDefaultName, setSaveDialogDefaultName] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setFiles(await fetchFiles())
    } catch {
      setError('无法连接服务器')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!collapsed) refresh()
  }, [collapsed, refresh])

  useEffect(() => {
    setCurrentFileId(openFileId ?? null)
  }, [openFileId])

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus()
  }, [renamingId])

  // Close context menu on outside click
  useEffect(() => {
    if (!menuId) return
    const close = () => setMenuId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuId])

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleOpen = async (file: DocFile) => {
    if (!editor) return
    setError(null)
    try {
      const res = await fetch(`/api/files/${encodeURIComponent(file.id)}`)
      if (!res.ok) throw new Error('下载失败')
      const blob = await res.blob()
      const f = new File([blob], `${file.name}.docx`, { type: blob.type })
      const html = await importDocx(f)
      editor.chain().focus().setContent(html).run()
      setCurrentFileId(file.id)
      onDocOpened?.(file)
    } catch (e) {
      setError(e instanceof Error ? e.message : '打开失败')
    }
  }

  const handleNew = () => {
    if (!editor) return
    editor.chain().focus().clearContent().run()
    setCurrentFileId(null)
    onDocOpened?.({ id: '', name: '新文档', size: 0, updatedAt: new Date().toISOString() })
  }

  const handleSave = async (nameOverride?: string) => {
    if (!editor || !currentDoc) return
    // First save: show naming dialog
    if (!currentFileId && nameOverride === undefined) {
      setSaveDialogDefaultName(getDocumentTitle(editor))
      setShowSaveDialog(true)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const html = editor.getHTML()
      const blob = await exportDocx(currentDoc, pageConfig, html)
      const name = nameOverride ?? currentDoc.title ?? '新文档'
      let saved: DocFile
      if (currentFileId) {
        saved = await overwriteDocx(currentFileId, blob, name)
      } else {
        saved = await uploadDocx(blob, name)
      }
      setCurrentFileId(saved.id)
      onDocOpened?.(saved)
      await refresh()
      document.dispatchEvent(
        new CustomEvent('autosave:manualsave', { detail: { fileName: saved.name, isAuto: false } }),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setMenuId(null)
    if (!confirm('确定要删除此文档吗？')) return
    try {
      await deleteFile(id)
      if (currentFileId === id) setCurrentFileId(null)
      await refresh()
    } catch {
      setError('删除失败')
    }
  }

  const startRename = (file: DocFile) => {
    setMenuId(null)
    setRenamingId(file.id)
    setRenameValue(file.name)
  }

  const commitRename = async () => {
    if (!renamingId || !renameValue.trim()) { setRenamingId(null); return }
    try {
      await renameFile(renamingId, renameValue.trim())
      setRenamingId(null)
      await refresh()
    } catch {
      setError('重命名失败')
    }
  }

  // Ctrl+S shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, currentDoc, pageConfig, currentFileId])

  // 2-second debounce auto-save when a file is open
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!editor || !currentDoc || !currentFileId) return
    const triggerAutoSave = () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      autoSaveTimer.current = setTimeout(async () => {
        if (!editor || !currentDoc || !currentFileId) return
        try {
          const html = editor.getHTML()
          const blob = await exportDocx(currentDoc, pageConfig, html)
          const name = currentDoc.title || '新文档'
          const saved = await overwriteDocx(currentFileId, blob, name)
          document.dispatchEvent(
            new CustomEvent('autosave:manualsave', { detail: { fileName: saved.name, isAuto: true } }),
          )
        } catch { /* silent auto-save failure */ }
      }, 2000)
    }
    editor.on('update', triggerAutoSave)
    return () => {
      editor.off('update', triggerAutoSave)
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, currentDoc, pageConfig, currentFileId])

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', height: '100%', flexShrink: 0, position: 'relative' }}>
      {/* Sidebar panel */}
      <div
        style={{
          width: collapsed ? 0 : 220,
          overflow: 'hidden',
          transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
          background: '#f8fafc',
          borderRight: collapsed ? 'none' : '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* Header */}
        <div style={{
          padding: '10px 12px 8px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FolderOpen size={14} style={{ color: '#4b5563' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>文档</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <IconBtn title="新建" onClick={handleNew}><FilePlus size={13} /></IconBtn>
            <IconBtn title={saving ? '保存中…' : 'Ctrl+S 保存'} onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
            </IconBtn>
          </div>
        </div>

        {/* File list */}
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
          {loading && (
            <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', display: 'inline' }} />
            </div>
          )}
          {!loading && error && (
            <div style={{ padding: '8px 12px', fontSize: 11, color: '#ef4444' }}>{error}</div>
          )}
          {!loading && !error && files.length === 0 && (
            <div style={{ padding: '20px 12px', textAlign: 'center', color: '#9ca3af', fontSize: 11 }}>
              暂无文档<br />
              <span style={{ color: '#3b82f6', cursor: 'pointer' }} onClick={handleNew}>+ 新建</span>
            </div>
          )}
          {files.map(file => (
            <FileItem
              key={file.id}
              file={file}
              isActive={file.id === currentFileId}
              isRenaming={renamingId === file.id}
              renameValue={renameValue}
              renameInputRef={renamingId === file.id ? renameInputRef : undefined}
              menuOpen={menuId === file.id}
              onOpen={() => handleOpen(file)}
              onStartRename={() => startRename(file)}
              onRenameChange={setRenameValue}
              onRenameCommit={commitRename}
              onRenameCancel={() => setRenamingId(null)}
              onDelete={() => handleDelete(file.id)}
              onMenuToggle={e => { e.stopPropagation(); setMenuId(menuId === file.id ? null : file.id) }}
            />
          ))}
        </div>
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(v => !v)}
        title={collapsed ? '展开文档列表' : '收起文档列表'}
        style={{
          position: 'absolute',
          top: '50%',
          right: collapsed ? -16 : -16,
          transform: 'translateY(-50%)',
          zIndex: 10,
          width: 16,
          height: 48,
          background: '#e2e8f0',
          border: '1px solid #cbd5e1',
          borderLeft: 'none',
          borderRadius: '0 6px 6px 0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          padding: 0,
        }}
      >
        {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </button>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>

      {/* Save naming dialog */}
      {showSaveDialog && (
        <SaveDialog
          defaultName={saveDialogDefaultName}
          onConfirm={name => { setShowSaveDialog(false); handleSave(name) }}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}
    </div>
  )
}

// ── FileItem ──────────────────────────────────────────────────────────────────

interface FileItemProps {
  file: DocFile
  isActive: boolean
  isRenaming: boolean
  renameValue: string
  renameInputRef?: React.RefObject<HTMLInputElement>
  menuOpen: boolean
  onOpen: () => void
  onStartRename: () => void
  onRenameChange: (v: string) => void
  onRenameCommit: () => void
  onRenameCancel: () => void
  onDelete: () => void
  onMenuToggle: (e: React.MouseEvent) => void
}

function FileItem({
  file, isActive, isRenaming, renameValue, renameInputRef,
  menuOpen, onOpen, onStartRename, onRenameChange, onRenameCommit, onRenameCancel, onDelete, onMenuToggle,
}: FileItemProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{
        position: 'relative',
        padding: '6px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: isActive ? '#dbeafe' : hovered ? '#f1f5f9' : 'transparent',
        cursor: isRenaming ? 'default' : 'pointer',
        borderLeft: isActive ? '2px solid #2563eb' : '2px solid transparent',
        transition: 'background 0.1s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={onStartRename}
      onClick={() => { if (!isRenaming) onOpen() }}
    >
      <FileText size={12} style={{ color: isActive ? '#2563eb' : '#6b7280', flexShrink: 0 }} />

      {isRenaming ? (
        <input
          ref={renameInputRef}
          value={renameValue}
          onChange={e => onRenameChange(e.target.value)}
          onBlur={onRenameCommit}
          onKeyDown={e => {
            if (e.key === 'Enter') onRenameCommit()
            if (e.key === 'Escape') onRenameCancel()
            e.stopPropagation()
          }}
          onClick={e => e.stopPropagation()}
          style={{
            flex: 1, fontSize: 12, border: '1px solid #3b82f6',
            borderRadius: 3, padding: '1px 5px', outline: 'none',
          }}
        />
      ) : (
        <span style={{
          flex: 1, fontSize: 12, color: isActive ? '#1e40af' : '#374151',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {file.name || '未命名文档'}
        </span>
      )}

      {/* Menu button (hover) */}
      {(hovered || menuOpen) && !isRenaming && (
        <button
          onClick={onMenuToggle}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2, flexShrink: 0 }}
        >
          <MoreVertical size={12} />
        </button>
      )}

      {/* Context menu */}
      {menuOpen && (
        <div
          style={{
            position: 'absolute', top: '100%', right: 8, zIndex: 100,
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)', padding: '4px 0', minWidth: 120,
          }}
          onClick={e => e.stopPropagation()}
        >
          <MenuItem onClick={onStartRename}>重命名</MenuItem>
          <MenuItem onClick={onDelete} danger>删除</MenuItem>
        </div>
      )}
    </div>
  )
}

function IconBtn({ children, onClick, title, disabled }: { children: React.ReactNode; onClick: () => void; title?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        color: '#6b7280', padding: 4, borderRadius: 4, display: 'flex',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '6px 12px', border: 'none', background: hovered ? '#f1f5f9' : 'transparent',
        cursor: 'pointer', fontSize: 12,
        color: danger ? '#ef4444' : '#374151',
      }}
    >
      {children}
    </button>
  )
}

// ── SaveDialog ────────────────────────────────────────────────────────────────

interface SaveDialogProps {
  defaultName: string
  onConfirm: (name: string) => void
  onCancel: () => void
}

function SaveDialog({ defaultName, onConfirm, onCancel }: SaveDialogProps) {
  const [name, setName] = useState(defaultName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const confirm = () => {
    const trimmed = name.trim()
    if (trimmed) onConfirm(trimmed)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: 340,
          background: 'rgba(13, 10, 30, 0.94)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(178, 75, 255, 0.3)',
          borderRadius: 12,
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(178, 75, 255, 0.1)',
          padding: '24px',
          color: '#e0e8ff',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#e0e8ff' }}>
          保存文档
        </h3>
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') confirm()
            if (e.key === 'Escape') onCancel()
          }}
          placeholder="请输入文件名"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6, padding: '8px 10px',
            fontSize: 13, color: '#e0e8ff', outline: 'none',
            marginBottom: 16, display: 'block',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.5)'
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 212, 255, 0.15)'
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '7px 16px', fontSize: 13, borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent', color: '#a0aec0', cursor: 'pointer',
            }}
          >
            取消
          </button>
          <button
            onClick={confirm}
            disabled={!name.trim()}
            style={{
              padding: '7px 16px', fontSize: 13, borderRadius: 6,
              border: 'none',
              background: name.trim() ? 'rgba(0, 212, 255, 0.85)' : 'rgba(0, 212, 255, 0.25)',
              color: name.trim() ? '#0a0e1a' : '#5a8a9a',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
              fontWeight: 600,
            }}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  )
}
