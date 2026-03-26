/**
 * CommentMark — TipTap Mark for inline annotations.
 * Highlighted text stores a comment ID; the actual comment text lives in
 * the CommentStore (React state lifted to App.tsx).
 */

import { Mark, mergeAttributes } from '@tiptap/core'

export interface Comment {
  id: string
  text: string
  author?: string
  createdAt: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comment: {
      setComment: (commentId: string) => ReturnType
      unsetComment: (commentId: string) => ReturnType
    }
  }
}

export const CommentMark = Mark.create({
  name: 'comment',
  inclusive: false,

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-comment-id'),
        renderHTML: (attrs) => {
          if (!attrs.commentId) return {}
          return { 'data-comment-id': attrs.commentId }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-comment-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'comment-mark' }), 0]
  },

  addCommands() {
    return {
      setComment:
        (commentId: string) =>
        ({ commands }) =>
          commands.setMark(this.name, { commentId }),

      unsetComment:
        (commentId: string) =>
        ({ chain, state }) => {
          // Remove all comment marks matching this ID
          const { from, to } = state.selection
          return chain().unsetMark(this.name).run()
        },
    }
  },
})
