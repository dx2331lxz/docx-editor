import { Extension } from '@tiptap/core'
import { convertSimplifiedToTraditional, convertTraditionalToSimplified } from '../utils/chineseConvert'

export const ChineseConvertExtension = Extension.create({
  name: 'chineseConvert',
  addCommands() {
    return {
      convertToTraditional: () => ({ editor }) => {
        const { state } = editor
        const { from, to, empty } = state.selection
        if (empty) {
          const { tr, doc } = state
          doc.descendants((node, pos) => {
            if (node.isText && node.text) {
              const newText = convertSimplifiedToTraditional(node.text)
              if (newText !== node.text) {
                tr.insertText(newText, tr.mapping.map(pos), tr.mapping.map(pos + node.nodeSize))
              }
            }
          })
          editor.view.dispatch(tr)
        } else {
          const selectedText = state.doc.textBetween(from, to)
          const converted = convertSimplifiedToTraditional(selectedText)
          editor.chain().focus().insertContentAt({ from, to }, converted).run()
        }
        return true
      },
      convertToSimplified: () => ({ editor }) => {
        const { state } = editor
        const { from, to, empty } = state.selection
        if (empty) {
          const { tr, doc } = state
          doc.descendants((node, pos) => {
            if (node.isText && node.text) {
              const newText = convertTraditionalToSimplified(node.text)
              if (newText !== node.text) {
                tr.insertText(newText, tr.mapping.map(pos), tr.mapping.map(pos + node.nodeSize))
              }
            }
          })
          editor.view.dispatch(tr)
        } else {
          const selectedText = state.doc.textBetween(from, to)
          const converted = convertTraditionalToSimplified(selectedText)
          editor.chain().focus().insertContentAt({ from, to }, converted).run()
        }
        return true
      },
    } as Record<string, unknown>
  },
})
