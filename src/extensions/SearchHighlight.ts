import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const searchHighlightKey = new PluginKey('searchHighlight')

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchHighlight: {
      setSearchTerm: (term: string) => ReturnType
      clearSearch: () => ReturnType
    }
  }
}

export const SearchHighlight = Extension.create({
  name: 'searchHighlight',

  addStorage() {
    return { searchTerm: '' }
  },

  addCommands() {
    return {
      setSearchTerm: (term: string) => ({ editor }) => {
        editor.storage.searchHighlight.searchTerm = term
        editor.view.dispatch(editor.state.tr)
        return true
      },
      clearSearch: () => ({ editor }) => {
        editor.storage.searchHighlight.searchTerm = ''
        editor.view.dispatch(editor.state.tr)
        return true
      },
    }
  },

  addProseMirrorPlugins() {
    const extensionRef = this
    return [
      new Plugin({
        key: searchHighlightKey,
        props: {
          decorations(state) {
            const term = extensionRef.storage.searchTerm as string
            if (!term) return DecorationSet.empty
            const decorations: Decoration[] = []
            const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const regex = new RegExp(escaped, 'gi')
            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return
              let match: RegExpExecArray | null
              while ((match = regex.exec(node.text)) !== null) {
                const from = pos + match.index
                const to = from + match[0].length
                decorations.push(
                  Decoration.inline(from, to, {
                    class: 'search-highlight',
                  })
                )
              }
            })
            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
