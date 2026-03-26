import { Extension } from '@tiptap/core'
import '@tiptap/extension-text-style'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    letterSpacing: {
      setLetterSpacing: (spacing: string) => ReturnType
      unsetLetterSpacing: () => ReturnType
    }
  }
}

export const LetterSpacing = Extension.create({
  name: 'letterSpacing',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          letterSpacing: {
            default: null,
            parseHTML: (el) => {
              const val = el.style.letterSpacing
              return val ? val.replace('px', '') : null
            },
            renderHTML: (attrs) => {
              if (!attrs.letterSpacing) return {}
              return { style: `letter-spacing: ${attrs.letterSpacing}px` }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setLetterSpacing: (spacing: string) => ({ chain }) =>
        chain().setMark('textStyle', { letterSpacing: spacing }).run(),
      unsetLetterSpacing: () => ({ chain }) =>
        chain().setMark('textStyle', { letterSpacing: null }).run(),
    }
  },
})
