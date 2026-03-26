/**
 * TrackChanges TipTap Extension
 *
 * Provides a `trackChange` mark that styles:
 *   - type: 'insert'  → green underline
 *   - type: 'delete'  → red strikethrough
 *
 * Commands:
 *   editor.commands.toggleTrackChanges()  — enable/disable tracking
 *   editor.commands.acceptAllChanges()    — remove all marks (keep insert text, delete delete text)
 *   editor.commands.rejectAllChanges()    — remove all marks (keep original: delete insert text, restore delete text)
 *
 * The tracking state is stored on the extension instance (not in editor state)
 * and exposed via a custom event for React to react to.
 */

import { Mark, mergeAttributes, Extension } from '@tiptap/core'

// ── TrackChange Mark ───────────────────────────────────────────────────────────

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    trackChange: {
      setTrackChange: (type: 'insert' | 'delete', author?: string) => ReturnType
      unsetTrackChange: () => ReturnType
    }
    trackChanges: {
      toggleTrackChanges: () => ReturnType
      acceptAllChanges: () => ReturnType
      rejectAllChanges: () => ReturnType
      acceptCurrentChange: () => ReturnType
      rejectCurrentChange: () => ReturnType
    }
  }
}

export const TrackChangeMark = Mark.create({
  name: 'trackChange',
  priority: 1000,
  keepOnSplit: false,
  excludes: '',

  addAttributes() {
    return {
      type: { default: 'insert', parseHTML: (el) => el.getAttribute('data-change-type') },
      author: { default: 'User', parseHTML: (el) => el.getAttribute('data-author') },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-change-type]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      'data-change-type': HTMLAttributes.type,
      'data-author': HTMLAttributes.author,
      class: HTMLAttributes.type === 'insert' ? 'track-insert' : 'track-delete',
    }), 0]
  },

  addCommands() {
    return {
      setTrackChange: (type: 'insert' | 'delete', author = 'User') =>
        ({ commands }) =>
          commands.setMark(this.name, { type, author }),
      unsetTrackChange: () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    }
  },
})

// ── Track Changes controller Extension ────────────────────────────────────────

// Global tracking flag (outside of TipTap state to avoid circular issues)
let _trackingEnabled = false
export const isTrackingEnabled = () => _trackingEnabled

export const TrackChangesExtension = Extension.create({
  name: 'trackChanges',

  addCommands() {
    return {
      toggleTrackChanges: () => ({ editor }) => {
        _trackingEnabled = !_trackingEnabled
        // Dispatch a DOM event so React components can react
        document.dispatchEvent(new CustomEvent('trackchanges:toggle', { detail: { enabled: _trackingEnabled } }))
        return true
      },

      acceptAllChanges: () => ({ tr, state, dispatch }) => {
        // Remove all trackChange marks of type 'insert' (keep text)
        // Delete all trackChange marks of type 'delete' (and their text)
        const { doc } = state
        const newTr = tr

        // First pass: collect positions of 'delete' marked text to remove
        const toDelete: { from: number; to: number }[] = []
        doc.descendants((node, pos) => {
          if (!node.isText) return
          node.marks.forEach((mark) => {
            if (mark.type.name === 'trackChange' && mark.attrs.type === 'delete') {
              toDelete.push({ from: pos, to: pos + node.nodeSize })
            }
          })
        })
        // Remove delete-marked ranges (in reverse order to keep positions valid)
        toDelete.reverse().forEach(({ from, to }) => {
          newTr.delete(from, to)
        })

        // Second pass: remove all remaining trackChange marks
        newTr.removeMark(0, newTr.doc.content.size, state.schema.marks.trackChange)

        if (dispatch) dispatch(newTr)
        return true
      },

      rejectAllChanges: () => ({ tr, state, dispatch }) => {
        const { doc } = state
        const newTr = tr

        // Delete all 'insert' marked text
        const toDelete: { from: number; to: number }[] = []
        doc.descendants((node, pos) => {
          if (!node.isText) return
          node.marks.forEach((mark) => {
            if (mark.type.name === 'trackChange' && mark.attrs.type === 'insert') {
              toDelete.push({ from: pos, to: pos + node.nodeSize })
            }
          })
        })
        toDelete.reverse().forEach(({ from, to }) => {
          newTr.delete(from, to)
        })

        // Remove all remaining trackChange marks (restore deleted text styling to normal)
        newTr.removeMark(0, newTr.doc.content.size, state.schema.marks.trackChange)

        if (dispatch) dispatch(newTr)
        return true
      },

      acceptCurrentChange: () => ({ tr, state, dispatch }) => {
        const { selection, doc } = state
        const { from, to } = selection

        // Within selection: delete 'delete'-marked text, keep 'insert'-marked text
        const toDelete: { from: number; to: number }[] = []
        doc.nodesBetween(from, to, (node, pos) => {
          if (!node.isText) return
          node.marks.forEach((mark) => {
            if (mark.type.name === 'trackChange' && mark.attrs.type === 'delete') {
              toDelete.push({ from: pos, to: pos + node.nodeSize })
            }
          })
        })
        toDelete.reverse().forEach(({ from: f, to: t }) => { tr.delete(f, t) })
        tr.removeMark(from, to, state.schema.marks.trackChange)
        if (dispatch) dispatch(tr)
        return true
      },

      rejectCurrentChange: () => ({ tr, state, dispatch }) => {
        const { selection, doc } = state
        const { from, to } = selection

        const toDelete: { from: number; to: number }[] = []
        doc.nodesBetween(from, to, (node, pos) => {
          if (!node.isText) return
          node.marks.forEach((mark) => {
            if (mark.type.name === 'trackChange' && mark.attrs.type === 'insert') {
              toDelete.push({ from: pos, to: pos + node.nodeSize })
            }
          })
        })
        toDelete.reverse().forEach(({ from: f, to: t }) => { tr.delete(f, t) })
        tr.removeMark(from, to, state.schema.marks.trackChange)
        if (dispatch) dispatch(tr)
        return true
      },
    }
  },

  // Intercept keystrokes when tracking is enabled
  addKeyboardShortcuts() {
    return {
      // We can't easily intercept all text input here; the App-level
      // approach using onTransaction is preferred. This extension
      // is mainly for commands and state management.
    }
  },
})
