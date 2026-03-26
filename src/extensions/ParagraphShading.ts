import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphShading: {
      setParagraphBg: (color: string) => ReturnType
      unsetParagraphBg: () => ReturnType
    }
  }
}

export const ParagraphShading = Extension.create({
  name: 'paragraphShading',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-bg-color') ?? null,
            renderHTML: (attributes) => {
              if (!attributes.backgroundColor) return {}
              return {
                'data-bg-color': attributes.backgroundColor,
                style: `background-color: ${attributes.backgroundColor}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setParagraphBg: (color: string) => ({ commands }) =>
        commands.updateAttributes('paragraph', { backgroundColor: color }),
      unsetParagraphBg: () => ({ commands }) =>
        commands.updateAttributes('paragraph', { backgroundColor: null }),
    }
  },
})
