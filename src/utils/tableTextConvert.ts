import type { Editor } from '@tiptap/react'
import type { Node } from '@tiptap/pm/model'

export function tableToText(editor: Editor, separator: string = '\t'): void {
  const { state } = editor
  const { selection } = state
  let tablePos = -1
  let tableNode: Node | null = null
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'table' && tablePos === -1) {
      if (pos <= selection.from && pos + node.nodeSize >= selection.to) {
        tablePos = pos
        tableNode = node
      }
    }
  })
  if (!tableNode || tablePos === -1) return

  const lines: string[] = []
  ;(tableNode as Node).forEach(row => {
    const cells: string[] = []
    row.forEach(cell => {
      cells.push(cell.textContent)
    })
    lines.push(cells.join(separator))
  })

  const text = lines.join('\n')
  editor.chain().focus()
    .deleteRange({ from: tablePos, to: tablePos + (tableNode as Node).nodeSize })
    .insertContentAt(tablePos, text)
    .run()
}

export function textToTable(editor: Editor, separator: string = '\t'): void {
  const { state } = editor
  const { from, to, empty } = state.selection
  if (empty) return

  const text = state.doc.textBetween(from, to, '\n')
  const rows = text.split('\n').filter(r => r.trim())
  if (rows.length === 0) return

  const allCells = rows.map(r => r.split(separator))
  const maxCols = Math.max(...allCells.map(r => r.length))

  const tableContent = {
    type: 'table',
    content: allCells.map((cells, ri) => ({
      type: 'tableRow',
      content: Array.from({ length: maxCols }, (_, ci) => ({
        type: ri === 0 ? 'tableHeader' : 'tableCell',
        content: [{ type: 'paragraph', content: cells[ci] ? [{ type: 'text', text: cells[ci] }] : [] }]
      }))
    }))
  }

  editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, tableContent).run()
}
