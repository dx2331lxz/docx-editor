import mammoth from 'mammoth'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx'
import type { AIDocument, AIDocumentNode } from '../types/editor'

/** Import a .docx file and return its HTML content (via mammoth) */
export async function importDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.convertToHtml({ arrayBuffer })
  return result.value
}

// ── Export helpers ───────────────────────────────────────────────────────────

/** Map TipTap text-align value → docx AlignmentType */
function toAlignment(align?: string): AlignmentType | undefined {
  switch (align) {
    case 'center':  return AlignmentType.CENTER
    case 'right':   return AlignmentType.RIGHT
    case 'justify': return AlignmentType.JUSTIFIED
    case 'left':
    default:        return AlignmentType.LEFT
  }
}

/** Map heading level → docx HeadingLevel */
function toHeadingLevel(level?: number): HeadingLevel {
  const map: Record<number, HeadingLevel> = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
    5: HeadingLevel.HEADING_5,
    6: HeadingLevel.HEADING_6,
  }
  return map[level ?? 1] ?? HeadingLevel.HEADING_1
}

/** Build TextRun array from a TipTap node's inline children */
function buildRuns(node: AIDocumentNode): TextRun[] {
  return (node.content ?? [])
    .filter((child) => child.type === 'text' || child.type === 'hardBreak')
    .map((child) => {
      if (child.type === 'hardBreak') return new TextRun({ break: 1 })

      const marks = child.marks ?? []
      const hasMark = (type: string) => marks.some((m) => m.type === type)
      const markAttrs = (type: string) =>
        marks.find((m) => m.type === type)?.attrs ?? {}

      const styleAttrs = markAttrs('textStyle') as Record<string, string>
      const fontFamily = styleAttrs.fontFamily?.replace(/"/g, '').split(',')[0]?.trim()
      const fontSizePx = styleAttrs.fontSize ? parseInt(styleAttrs.fontSize) : undefined
      // docx size is in half-points; 1pt = 1.333px, so px * (1/1.333) * 2 ≈ px * 1.5
      const sizeHalfPt = fontSizePx ? Math.round(fontSizePx * 1.5) : undefined

      return new TextRun({
        text:     child.text ?? '',
        bold:     hasMark('bold'),
        italics:  hasMark('italic'),
        underline: hasMark('underline') ? {} : undefined,
        strike:   hasMark('strike'),
        color:    (markAttrs('textColor') as Record<string,string>)?.color?.replace('#', '')
                  ?? (styleAttrs.color?.replace('#', '') || undefined),
        font:     fontFamily ? { name: fontFamily } : undefined,
        size:     sizeHalfPt,
      })
    })
}

/** Recursively convert an AIDocumentNode to docx Paragraph(s) */
function nodeToParagraphs(node: AIDocumentNode): Paragraph[] {
  const align = toAlignment(node.attrs?.textAlign as string | undefined)

  if (node.type === 'heading') {
    return [
      new Paragraph({
        heading: toHeadingLevel(node.attrs?.level as number | undefined),
        alignment: align,
        children: buildRuns(node),
      }),
    ]
  }

  if (node.type === 'paragraph') {
    return [
      new Paragraph({
        alignment: align,
        children: buildRuns(node),
      }),
    ]
  }

  if (node.type === 'bulletList' || node.type === 'orderedList') {
    return (node.content ?? []).flatMap((item) =>
      (item.content ?? []).flatMap((child) => nodeToParagraphs(child))
    )
  }

  if (node.type === 'blockquote') {
    return (node.content ?? []).flatMap(nodeToParagraphs)
  }

  if (node.type === 'codeBlock') {
    const text = node.content?.map((c) => c.text ?? '').join('') ?? ''
    return [new Paragraph({ children: [new TextRun({ text, font: { name: 'Courier New' } })] })]
  }

  // Fallback: recurse into children
  return (node.content ?? []).flatMap(nodeToParagraphs)
}

/** Export TipTap JSON document to a .docx Blob */
export async function exportDocx(doc: AIDocument): Promise<Blob> {
  const children = doc.content.flatMap(nodeToParagraphs)
  const document = new Document({ sections: [{ children }] })
  return Packer.toBlob(document)
}
