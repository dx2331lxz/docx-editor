import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphSpacing: {
      setParagraphSpacing: (options: { before?: number; after?: number; paddingLeft?: number; paddingRight?: number }) => ReturnType
    }
  }
}

export const ParagraphSpacing = Extension.create({
  name: 'paragraphSpacing',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          marginTop: {
            default: null,
            parseHTML: (el) => {
              const val = el.getAttribute('data-margin-top')
              return val ? parseFloat(val) : null
            },
            renderHTML: (attrs) => {
              if (attrs.marginTop == null) return {}
              return {
                'data-margin-top': String(attrs.marginTop),
                style: `margin-top: ${attrs.marginTop}pt`,
              }
            },
          },
          marginBottom: {
            default: null,
            parseHTML: (el) => {
              const val = el.getAttribute('data-margin-bottom')
              return val ? parseFloat(val) : null
            },
            renderHTML: (attrs) => {
              if (attrs.marginBottom == null) return {}
              return {
                'data-margin-bottom': String(attrs.marginBottom),
                style: `margin-bottom: ${attrs.marginBottom}pt`,
              }
            },
          },
          paddingLeft: {
            default: null,
            parseHTML: (el) => {
              const val = el.getAttribute('data-padding-left')
              return val ? parseFloat(val) : null
            },
            renderHTML: (attrs) => {
              if (attrs.paddingLeft == null) return {}
              return {
                'data-padding-left': String(attrs.paddingLeft),
                style: `padding-left: ${attrs.paddingLeft}cm`,
              }
            },
          },
          paddingRight: {
            default: null,
            parseHTML: (el) => {
              const val = el.getAttribute('data-padding-right')
              return val ? parseFloat(val) : null
            },
            renderHTML: (attrs) => {
              if (attrs.paddingRight == null) return {}
              return {
                'data-padding-right': String(attrs.paddingRight),
                style: `padding-right: ${attrs.paddingRight}cm`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setParagraphSpacing:
        ({ before, after, paddingLeft, paddingRight }) =>
        ({ commands }) => {
          const attrs: Record<string, number | null> = {}
          if (before !== undefined) attrs.marginTop = before
          if (after !== undefined) attrs.marginBottom = after
          if (paddingLeft !== undefined) attrs.paddingLeft = paddingLeft
          if (paddingRight !== undefined) attrs.paddingRight = paddingRight
          return commands.updateAttributes('paragraph', attrs)
        },
    }
  },
})
