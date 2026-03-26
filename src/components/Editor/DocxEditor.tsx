/**
 * useDocxEditor — custom hook that initializes TipTap with all extensions.
 * Each extension is independently loaded for maximum extensibility.
 * The document is always available as AIDocument (JSON) for AI operations.
 */

import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle, FontSize, LineHeight } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'

import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import { FirstLineIndent } from '../../extensions/FirstLineIndent'
import { SearchHighlight } from '../../extensions/SearchHighlight'
import { ParagraphShading } from '../../extensions/ParagraphShading'
import { LetterSpacing } from '../../extensions/LetterSpacing'
import { ParagraphSpacing } from '../../extensions/ParagraphSpacing'
import { PageBreak } from '../../extensions/PageBreak'
import { CommentMark } from '../../extensions/CommentMark'
import { ResizableImage } from '../../extensions/ResizableImage'
import { TableOfContentsNode } from '../TOC/TableOfContents'
import { TrackChangeMark, TrackChangesExtension } from '../../extensions/TrackChanges'
import { FootnoteRef, FootnoteSectionNode, FootnoteCommandsExtension } from '../../extensions/Footnote'
import { SectionBreak } from '../../extensions/SectionBreak'
import { ChineseConvertExtension } from '../../extensions/ChineseConvert'
import { BookmarkMark } from '../../extensions/Bookmark'
import { SpellCheck } from '../../extensions/SpellCheck'
import type { EditorStats, AIDocument } from '../../types/editor'

interface UseDocxEditorOptions {
  initialContent?: string
  onStatsChange?: (stats: EditorStats) => void
  onDocumentChange?: (doc: AIDocument) => void
}

export const INITIAL_CONTENT = `
<h1>欢迎使用 DocxEditor</h1>
<p>这是一个对标 WPS 的在线文档编辑器，基于 TipTap + React + TypeScript 构建。</p>
<p>主要特性：</p>
<ul>
  <li><strong>富文本格式</strong>：粗体、斜体、下划线、删除线、高亮</li>
  <li><strong>段落对齐</strong>：左对齐、居中、右对齐、两端对齐</li>
  <li><strong>多级标题</strong>：H1 ~ H6</li>
  <li><strong>列表</strong>：无序列表、有序列表</li>
  <li><strong>表格</strong>：可调整大小的表格</li>
  <li><strong>DOCX 导入/导出</strong>：支持 .docx 格式</li>
  <li><strong>字体/字号/颜色/行距</strong>：完整排版控制</li>
</ul>
<p>后续将接入 <strong>AI 自动排版</strong>（/api/ai-format），实现 Vibe Editing。</p>
`

function computeStats(editor: ReturnType<typeof useEditor>): EditorStats {
  if (!editor) return { characters: 0, words: 0, paragraphs: 0 }
  const storage = editor.storage.characterCount as {
    characters: () => number
    words: () => number
  }
  const paragraphs = editor
    .getText()
    .split('\n')
    .filter((l) => l.trim().length > 0).length
  return {
    characters: storage.characters(),
    words: storage.words(),
    paragraphs,
  }
}

export function useDocxEditor(options: UseDocxEditorOptions = {}) {
  const { initialContent, onStatsChange, onDocumentChange } = options

  const editor = useEditor({
    extensions: [
      // ── Core ──────────────────────────────────────────────────
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),

      // ── Text style extensions (each independently encapsulated) ──
      TextStyle,
      Color,
      FontFamily,
      FontSize,     // from @tiptap/extension-text-style
      LineHeight,   // from @tiptap/extension-text-style
      Underline,
      Superscript,
      Subscript,
      Highlight.configure({ multicolor: true }),

      // ── Layout ────────────────────────────────────────────────
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),

      // ── Custom paragraph extensions ───────────────────────────
      FirstLineIndent,
      SearchHighlight,
      ParagraphShading,
      LetterSpacing,
      ParagraphSpacing,
      PageBreak,
      CommentMark,
      TableOfContentsNode,
      TrackChangeMark,
      TrackChangesExtension,
      FootnoteRef,
      FootnoteSectionNode,
      FootnoteCommandsExtension,
      SectionBreak,
      ChineseConvertExtension,
      BookmarkMark,
      SpellCheck,

      // ── Media & links ─────────────────────────────────────────
      ResizableImage.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: 'whenNotEditable', HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),

      // ── Table ─────────────────────────────────────────────────
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,

      // ── UX ────────────────────────────────────────────────────
      Placeholder.configure({ placeholder: '开始输入…' }),
      CharacterCount,
    ],

    content: initialContent ?? INITIAL_CONTENT,

    onCreate({ editor }) {
      // Sync stats on initial load
      onStatsChange?.(computeStats(editor))
      onDocumentChange?.(editor.getJSON() as AIDocument)
    },

    onUpdate({ editor }) {
      onDocumentChange?.(editor.getJSON() as AIDocument)
      onStatsChange?.(computeStats(editor))
    },
  })

  return editor
}
