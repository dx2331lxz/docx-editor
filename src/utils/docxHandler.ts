import mammoth from 'mammoth'
import JSZip from 'jszip'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx'
import type { AIDocument, AIDocumentNode } from '../types/editor'

// ── Import helpers ───────────────────────────────────────────────────────────

/** Parse the raw docx XML and build enhanced HTML preserving color/font/size/align */
async function importDocxEnhanced(arrayBuffer: ArrayBuffer): Promise<string> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(arrayBuffer)
  } catch {
    return ''
  }

  const docXmlFile = zip.file('word/document.xml')
  const stylesXmlFile = zip.file('word/styles.xml')
  if (!docXmlFile) return ''

  const [docXmlStr, stylesXmlStr] = await Promise.all([
    docXmlFile.async('string'),
    stylesXmlFile ? stylesXmlFile.async('string') : Promise.resolve(''),
  ])

  const parser = new DOMParser()
  const docDom = parser.parseFromString(docXmlStr, 'application/xml')
  const stylesDom = stylesXmlStr
    ? parser.parseFromString(stylesXmlStr, 'application/xml')
    : null

  // Build a map: styleId → { isHeading, headingLevel, listType }
  const styleMap = new Map<string, { headingLevel?: number; listType?: 'bullet' | 'number' }>()
  if (stylesDom) {
    const styleEls = stylesDom.querySelectorAll('style')
    styleEls.forEach(s => {
      const sid = s.getAttribute('w:styleId') ?? ''
      const basedOn = s.querySelector('basedOn')?.getAttribute('w:val') ?? ''
      const name = s.querySelector('name')?.getAttribute('w:val')?.toLowerCase() ?? ''
      let headingLevel: number | undefined
      if (name.startsWith('heading')) {
        const lvl = parseInt(name.replace('heading', '').trim())
        if (!isNaN(lvl)) headingLevel = lvl
      } else if (/^(heading|标题)\s*[1-6]$/.test(name)) {
        const lvl = parseInt(name.replace(/\D/g, ''))
        if (!isNaN(lvl)) headingLevel = lvl
      } else if (basedOn.startsWith('Heading') || basedOn.startsWith('heading')) {
        const lvl = parseInt(basedOn.replace(/\D/g, ''))
        if (!isNaN(lvl)) headingLevel = lvl
      }
      let listType: 'bullet' | 'number' | undefined
      if (name.includes('list bullet') || sid === 'ListBullet') listType = 'bullet'
      if (name.includes('list number') || sid === 'ListNumber') listType = 'number'
      if (headingLevel !== undefined || listType !== undefined) {
        styleMap.set(sid, { headingLevel, listType })
      }
    })
  }

  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

  function wAttr(el: Element, localName: string): string {
    return el.getAttributeNS(W, localName) ?? el.getAttribute('w:' + localName) ?? ''
  }

  function wChild(el: Element, localName: string): Element | null {
    return el.getElementsByTagNameNS(W, localName)[0] ?? null
  }

  function wChildren(el: Element, localName: string): Element[] {
    return Array.from(el.getElementsByTagNameNS(W, localName))
  }

  /** Convert a run's rPr into a CSS style string */
  function runStyle(rPr: Element | null): string {
    if (!rPr) return ''
    const styles: string[] = []

    // Font
    const rFonts = wChild(rPr, 'rFonts')
    const font = rFonts
      ? (wAttr(rFonts, 'ascii') || wAttr(rFonts, 'hAnsi') || wAttr(rFonts, 'eastAsia'))
      : ''
    if (font) styles.push(`font-family: "${font}"`)

    // Size (half-points → pt)
    const sz = wChild(rPr, 'sz')
    if (sz) {
      const halfPt = parseInt(wAttr(sz, 'val'))
      if (!isNaN(halfPt)) styles.push(`font-size: ${halfPt / 2}pt`)
    }

    // Color
    const color = wChild(rPr, 'color')
    if (color) {
      const val = wAttr(color, 'val')
      if (val && val !== 'auto') styles.push(`color: #${val}`)
    }

    return styles.join('; ')
  }

  /** Wrap text in inline formatting tags from rPr */
  function applyRunFormatting(rPr: Element | null, text: string): string {
    if (!rPr) return text
    let out = text
    const cssStyle = runStyle(rPr)
    if (cssStyle) out = `<span style="${cssStyle}">${out}</span>`
    if (wChild(rPr, 'b') !== null) out = `<strong>${out}</strong>`
    if (wChild(rPr, 'i') !== null) out = `<em>${out}</em>`
    if (wChild(rPr, 'u') !== null) out = `<u>${out}</u>`
    if (wChild(rPr, 'strike') !== null) out = `<s>${out}</s>`
    return out
  }

  /** Convert a single <w:r> to HTML */
  function runToHtml(r: Element): string {
    const rPr = wChild(r, 'rPr')
    const textEls = r.getElementsByTagNameNS(W, 't')
    const text = Array.from(textEls).map(t => t.textContent ?? '').join('')
    if (!text) return ''
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return applyRunFormatting(rPr, escaped)
  }

  /** Convert paragraph content (runs) to HTML string */
  function paraInnerHtml(p: Element): string {
    const runs = Array.from(p.childNodes).filter(
      n => n.nodeType === 1 && (n as Element).localName === 'r'
    ) as Element[]
    return runs.map(runToHtml).join('')
  }

  /** Get paragraph alignment CSS */
  function paraAlignStyle(pPr: Element | null): string {
    if (!pPr) return ''
    const jc = wChild(pPr, 'jc')
    if (!jc) return ''
    const val = wAttr(jc, 'val')
    const map: Record<string, string> = { center: 'center', right: 'right', both: 'justify', left: 'left' }
    const align = map[val]
    return align ? `text-align: ${align}` : ''
  }

  /** Convert <w:p> to HTML */
  function paragraphToHtml(p: Element): string {
    const pPr = wChild(p, 'pPr')
    const pStyle = pPr ? wChild(pPr, 'pStyle') : null
    const styleId = pStyle ? wAttr(pStyle, 'val') : ''
    const styleInfo = styleMap.get(styleId)

    const inner = paraInnerHtml(p)
    const alignStyle = paraAlignStyle(pPr)
    const styleAttr = alignStyle ? ` style="${alignStyle}"` : ''

    // Well-known heading style IDs from Word
    const headingPatterns = ['Heading1','Heading2','Heading3','Heading4','Heading5','Heading6']
    const headingIdx = headingPatterns.findIndex(h => h.toLowerCase() === styleId.toLowerCase())
    const headingLevel = styleInfo?.headingLevel ?? (headingIdx >= 0 ? headingIdx + 1 : undefined)

    if (headingLevel && headingLevel >= 1 && headingLevel <= 6) {
      return `<h${headingLevel}${styleAttr}>${inner}</h${headingLevel}>`
    }

    const listType = styleInfo?.listType
    if (listType === 'bullet') return `<li data-list="bullet"${styleAttr}>${inner}</li>`
    if (listType === 'number') return `<li data-list="number"${styleAttr}>${inner}</li>`

    // Check numPr for lists
    if (pPr) {
      const numPr = wChild(pPr, 'numPr')
      if (numPr) {
        return `<li data-list="bullet"${styleAttr}>${inner}</li>`
      }
    }

    return `<p${styleAttr}>${inner}</p>`
  }

  /** Convert <w:tbl> to HTML */
  function tableToHtml(tbl: Element): string {
    const rows = Array.from(tbl.childNodes).filter(
      n => n.nodeType === 1 && (n as Element).localName === 'tr'
    ) as Element[]
    const rowsHtml = rows.map(tr => {
      const cells = Array.from(tr.childNodes).filter(
        n => n.nodeType === 1 && (n as Element).localName === 'tc'
      ) as Element[]
      const cellsHtml = cells.map(tc => {
        const paras = Array.from(tc.childNodes).filter(
          n => n.nodeType === 1 && (n as Element).localName === 'p'
        ) as Element[]
        const content = paras.map(paragraphToHtml).join('')
        return `<td>${content}</td>`
      }).join('')
      return `<tr>${cellsHtml}</tr>`
    }).join('')
    return `<table>${rowsHtml}</table>`
  }

  // Walk body children
  const body = docDom.getElementsByTagNameNS(W, 'body')[0]
  if (!body) return ''

  const htmlParts: string[] = []
  let listBuffer: { type: 'bullet' | 'number'; items: string[] } | null = null

  function flushList() {
    if (!listBuffer) return
    const tag = listBuffer.type === 'bullet' ? 'ul' : 'ol'
    htmlParts.push(`<${tag}>${listBuffer.items.join('')}</${tag}>`)
    listBuffer = null
  }

  Array.from(body.childNodes).forEach(node => {
    if (node.nodeType !== 1) return
    const el = node as Element
    const localName = el.localName

    if (localName === 'p') {
      const html = paragraphToHtml(el)
      if (html.startsWith('<li')) {
        const listType = html.includes('data-list="number"') ? 'number' : 'bullet'
        const itemHtml = html.replace(/ data-list="[^"]*"/, '')
        if (listBuffer && listBuffer.type === listType) {
          listBuffer.items.push(itemHtml)
        } else {
          flushList()
          listBuffer = { type: listType, items: [itemHtml] }
        }
      } else {
        flushList()
        htmlParts.push(html)
      }
    } else if (localName === 'tbl') {
      flushList()
      htmlParts.push(tableToHtml(el))
    }
  })
  flushList()

  return htmlParts.join('\n')
}

/** Import a .docx file and return its HTML content */
export async function importDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()

  // Try enhanced XML-based import first for full fidelity
  try {
    const enhanced = await importDocxEnhanced(arrayBuffer)
    if (enhanced && enhanced.trim().length > 0) return enhanced
  } catch {
    // Fall through to mammoth
  }

  // Fallback: mammoth for basic conversion
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    { styleMap: ['u => u'] }
  )
  return result.value
}

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

      // Font size: may be in px, pt, or em
      let sizeHalfPt: number | undefined
      const fsRaw = styleAttrs.fontSize ?? ''
      if (fsRaw.endsWith('pt')) {
        sizeHalfPt = Math.round(parseFloat(fsRaw) * 2)
      } else if (fsRaw.endsWith('px')) {
        sizeHalfPt = Math.round(parseFloat(fsRaw) * 1.5)
      } else if (fsRaw) {
        const px = parseInt(fsRaw)
        if (!isNaN(px)) sizeHalfPt = Math.round(px * 1.5)
      }

      // Color: prefer textColor mark, then textStyle color
      const textColorAttrs = markAttrs('textColor') as Record<string, string>
      const rawColor = textColorAttrs?.color ?? styleAttrs.color ?? undefined
      const color = rawColor ? rawColor.replace('#', '') : undefined

      return new TextRun({
        text:      child.text ?? '',
        bold:      hasMark('bold'),
        italics:   hasMark('italic'),
        underline: hasMark('underline') ? {} : undefined,
        strike:    hasMark('strike'),
        color,
        font:      fontFamily ? { name: fontFamily } : undefined,
        size:      sizeHalfPt,
      })
    })
}

/** Build a docx Table from a TipTap table node */
function nodeToTable(node: AIDocumentNode): Table {
  const rows = (node.content ?? []).map((rowNode) => {
    const cells = (rowNode.content ?? []).map((cellNode) => {
      const cellParas = (cellNode.content ?? []).flatMap(nodeToParagraphs)
      return new TableCell({
        children: cellParas.length > 0 ? cellParas : [new Paragraph({ children: [] })],
        borders: {
          top:    { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left:   { style: BorderStyle.SINGLE, size: 1 },
          right:  { style: BorderStyle.SINGLE, size: 1 },
        },
      })
    })
    return new TableRow({ children: cells })
  })
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  })
}

/** Recursively convert an AIDocumentNode to docx block elements */
function nodeToParagraphs(node: AIDocumentNode): (Paragraph | Table)[] {
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
    // Extract line spacing
    const lineHeight = node.attrs?.lineHeight as string | undefined
    let spacing: { line?: number; lineRule?: 'auto' | 'atLeast' | 'exact' } | undefined
    if (lineHeight) {
      const lhNum = parseFloat(lineHeight)
      if (!isNaN(lhNum)) {
        spacing = { line: Math.round(lhNum * 240), lineRule: 'auto' }
      }
    }

    return [
      new Paragraph({
        alignment: align,
        spacing,
        children: buildRuns(node),
      }),
    ]
  }

  if (node.type === 'bulletList') {
    return (node.content ?? []).flatMap((item) =>
      (item.content ?? []).flatMap((child) => {
        const paras = nodeToParagraphs(child)
        return paras.map((p, i) =>
          p instanceof Paragraph && i === 0
            ? new Paragraph({ ...p, bullet: { level: 0 } })
            : p
        )
      })
    )
  }

  if (node.type === 'orderedList') {
    return (node.content ?? []).flatMap((item, idx) =>
      (item.content ?? []).flatMap((child) => {
        const paras = nodeToParagraphs(child)
        return paras.map((p, i) =>
          p instanceof Paragraph && i === 0
            ? new Paragraph({ ...p, numbering: { reference: 'default-numbering', level: 0 } })
            : p
        )
      }).map(p => { void idx; return p })
    )
  }

  if (node.type === 'table') {
    return [nodeToTable(node)]
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
  const document = new Document({
    numbering: {
      config: [{
        reference: 'default-numbering',
        levels: [{
          level: 0,
          format: 'decimal',
          text: '%1.',
          alignment: AlignmentType.LEFT,
        }],
      }],
    },
    sections: [{ children }],
  })
  return Packer.toBlob(document)
}
