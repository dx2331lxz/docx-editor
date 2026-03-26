/**
 * FirstLineIndent — custom TipTap extension.
 * Adds a `textIndent` attribute to paragraph nodes, stored as integer "levels".
 * Each level = 2em of text-indent.
 *
 * Commands: increaseFirstLineIndent / decreaseFirstLineIndent
 */

import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    firstLineIndent: {
      increaseFirstLineIndent: () => ReturnType
      decreaseFirstLineIndent: () => ReturnType
      setFirstLineIndent: (level: number) => ReturnType
    }
  }
}

export const FirstLineIndent = Extension.create({
  name: 'firstLineIndent',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          firstLineIndent: {
            default: 0,
            parseHTML: (element) => {
              const val = element.style.textIndent
              if (!val) return 0
              // Parse "2em" → 1, "4em" → 2, etc.
              const em = parseFloat(val)
              return isNaN(em) ? 0 : Math.round(em / 2)
            },
            renderHTML: (attributes) => {
              if (!attributes.firstLineIndent) return {}
              return { style: `text-indent: ${attributes.firstLineIndent * 2}em` }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      increaseFirstLineIndent:
        () =>
        ({ commands, editor }) => {
          const current =
            (editor.getAttributes('paragraph').firstLineIndent as number) ?? 0
          return commands.updateAttributes('paragraph', {
            firstLineIndent: Math.min(current + 1, 10),
          })
        },

      decreaseFirstLineIndent:
        () =>
        ({ commands, editor }) => {
          const current =
            (editor.getAttributes('paragraph').firstLineIndent as number) ?? 0
          return commands.updateAttributes('paragraph', {
            firstLineIndent: Math.max(current - 1, 0),
          })
        },

      setFirstLineIndent:
        (level: number) =>
        ({ commands }) =>
          commands.updateAttributes('paragraph', { firstLineIndent: level }),
    }
  },
})
