/**
 * PageBreak — custom TipTap Node that inserts a page break.
 * Renders as a dashed horizontal line with a "分页符" label in the editor.
 * Outputs `<div style="page-break-after:always">` in HTML (honoured by CSS/print).
 */

import { Node, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      insertPageBreak: () => ReturnType
    }
  }
}

export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,   // non-editable, treated as a single unit

  parseHTML() {
    return [
      { tag: 'div[data-type="page-break"]' },
      { tag: 'div', style: 'page-break-after: always' },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-type': 'page-break',
      style: 'page-break-after: always',
    })]
  },

  addCommands() {
    return {
      insertPageBreak:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({ type: this.name })
            .run(),
    }
  },

  addKeyboardShortcuts() {
    return {
      // Ctrl+Enter = insert page break (WPS compatible)
      'Ctrl-Enter': () => this.editor.commands.insertPageBreak(),
    }
  },
})
