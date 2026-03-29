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
  const res = await fetch('/api/files')
  if (!res.ok) throw new Error('Failed to fetch files')
  return res.json()
}

async function uploadDocx(blob: Blob, name: string): Promise<DocFile> {
  const fd = new FormData()
  fd.append('file', blob, `${name}.docx`)
  fd.append('name', name)
  const res = await fetch('/api/files', { method: 'POST', body: fd })
  if (!res.ok) throw new Error('Upload failed')
  return res.json()
}

async function overwriteDocx(id: string, blob: Blob, name: string): Promise<DocFile> {
  // Delete old + upload new with same name intent
  await fetch(`/api/files/${encodeURIComponent(id)}`, { method: 'DELETE' })
  const fd = new FormData()
  fd.append('file', blob, `${name}.docx`)
  fd.append('name', name)
  const res = await fetch('/api/files', { method: 'POST', body: fd })
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

  const handleSave = async () => {
    if (!editor || !currentDoc) return
    setSaving(true)
    setError(null)
    try {
      const html = editor.getHTML()
      const blob = await exportDocx(currentDoc, pageConfig, html)
      const name = currentDoc.title || '新文档'
      let saved: DocFile
      if (currentFileId) {
        saved = await overwriteDocx(currentFileId, blob, name)
      } else {
        saved = await uploadDocx(blob, name)
      }
      setCurrentFileId(saved.id)
      onDocOpened?.(saved)
      await refresh()
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
          {file.name}
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
