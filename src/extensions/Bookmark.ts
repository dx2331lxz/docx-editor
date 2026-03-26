import { Mark, mergeAttributes } from '@tiptap/core'

export interface BookmarkMarkAttrs {
  id: string
  name: string
}

export const BookmarkMark = Mark.create<BookmarkMarkAttrs>({
  name: 'bookmark',
  addAttributes() {
    return {
      id: { default: null },
      name: { default: '' },
    }
  },
  parseHTML() {
    return [{ tag: 'span[data-bookmark]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      'data-bookmark': HTMLAttributes.name,
      class: 'bookmark-mark',
    }), 0]
  },
})
