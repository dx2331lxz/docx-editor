import type { Editor } from '@tiptap/react'

/** Remove all empty (blank) paragraphs from the document */
export function removeBlankParagraphs(editor: Editor): void {
  const { state } = editor
  const { tr, doc } = state
  const toDelete: { from: number; to: number }[] = []

  doc.forEach((node, pos) => {
    if (node.type.name === 'paragraph' && node.textContent.trim() === '') {
      toDelete.push({ from: pos, to: pos + node.nodeSize })
    }
  })

  // Delete in reverse to keep positions valid
  for (let i = toDelete.length - 1; i >= 0; i--) {
    tr.delete(toDelete[i].from, toDelete[i].to)
  }
  editor.view.dispatch(tr)
}

/** Add 2-em first-line indent to all paragraphs */
export function addFirstLineIndent(editor: Editor): void {
  const { state } = editor
  const { tr, doc } = state
  doc.forEach((node, pos) => {
    if (node.type.name === 'paragraph') {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, firstLineIndent: '2em' })
    }
  })
  editor.view.dispatch(tr)
}

/** Remove leading spaces from all paragraphs */
export function removeLeadingSpaces(editor: Editor): void {
  const { state } = editor
  const { tr, doc } = state
  doc.forEach((node, pos) => {
    if (node.type.name === 'paragraph') {
      // Get first text child
      const firstChild = node.firstChild
      if (firstChild && firstChild.isText && firstChild.text) {
        const trimmed = firstChild.text.replace(/^[\s\u3000]+/, '')
        if (trimmed !== firstChild.text) {
          tr.insertText(trimmed, pos + 1, pos + 1 + firstChild.text.length)
        }
      }
    }
  })
  editor.view.dispatch(tr)
}

const FULL_TO_HALF: Record<string, string> = {}
const HALF_TO_FULL: Record<string, string> = {}
// ASCII printable 0x21-0x7E ↔ Fullwidth 0xFF01-0xFF5E
for (let i = 0x21; i <= 0x7E; i++) {
  const half = String.fromCharCode(i)
  const full = String.fromCharCode(i + 0xFEE0)
  FULL_TO_HALF[full] = half
  HALF_TO_FULL[half] = full
}
// Space ↔ Ideographic space
FULL_TO_HALF['\u3000'] = ' '
HALF_TO_FULL[' '] = '\u3000'

/** Convert full-width characters to half-width in selection or entire doc */
export function fullToHalf(editor: Editor): void {
  transformText(editor, (c) => FULL_TO_HALF[c] ?? c)
}

/** Convert half-width characters to full-width in selection or entire doc */
export function halfToFull(editor: Editor): void {
  transformText(editor, (c) => HALF_TO_FULL[c] ?? c)
}

function transformText(editor: Editor, fn: (c: string) => string): void {
  const { state } = editor
  const { from, to, empty } = state.selection
  if (!empty) {
    const text = state.doc.textBetween(from, to)
    const converted = text.split('').map(fn).join('')
    editor.chain().focus().insertContentAt({ from, to }, converted).run()
  } else {
    const { tr, doc } = state
    doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        const newText = node.text.split('').map(fn).join('')
        if (newText !== node.text) {
          tr.insertText(newText, tr.mapping.map(pos), tr.mapping.map(pos + node.nodeSize))
        }
      }
    })
    editor.view.dispatch(tr)
  }
}

/** Smart format: add 2-em indent + remove extra blank lines */
export function smartFormat(editor: Editor): void {
  removeBlankParagraphs(editor)
  addFirstLineIndent(editor)
}
