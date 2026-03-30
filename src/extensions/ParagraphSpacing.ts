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
              // Priority 1: data attribute (internal round-trip)
              const dataVal = el.getAttribute('data-margin-top')
              if (dataVal) return parseFloat(dataVal)
              // Priority 2: inline CSS margin-top (from docx import)
              const style = el.style?.marginTop
              if (style) {
                const pt = parseFloat(style) // "12pt" → 12, "12.0pt" → 12
                if (!isNaN(pt) && pt > 0) return pt
              }
              return null
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
              // Priority 1: data attribute (internal round-trip)
              const dataVal = el.getAttribute('data-margin-bottom')
              if (dataVal) return parseFloat(dataVal)
              // Priority 2: inline CSS margin-bottom (from docx import)
              const style = el.style?.marginBottom
              if (style) {
                const pt = parseFloat(style)
                if (!isNaN(pt) && pt > 0) return pt
              }
              return null
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
