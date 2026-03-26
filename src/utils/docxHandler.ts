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

  const domParser = new DOMParser()
  const docDom = domParser.parseFromString(docXmlStr, 'application/xml')
  const stylesDom = stylesXmlStr
    ? domParser.parseFromString(stylesXmlStr, 'application/xml')
    : null

  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

  /** Get direct child element by local name */
  function wChild(el: Element, localName: string): Element | null {
    for (let i = 0; i < el.childNodes.length; i++) {
      const child = el.childNodes[i]
      if (child.nodeType === 1 && (child as Element).localName === localName) {
        return child as Element
      }
    }
    return null
  }

  /** Get attribute value — tries NS-aware then w: prefix */
  function wAttr(el: Element, localName: string): string {
    return el.getAttributeNS(W, localName) ?? el.getAttribute('w:' + localName) ?? ''
  }

  // Build a map: styleId → { headingLevel, listType }
  const styleMap = new Map<string, { headingLevel?: number; listType?: 'bullet' | 'number' }>()
  if (stylesDom) {
    const styleEls = Array.from(stylesDom.getElementsByTagNameNS(W, 'style'))
    for (const s of styleEls) {
      const sid = wAttr(s, 'styleId')
      const nameEl = Array.from(s.getElementsByTagNameNS(W, 'name'))[0]
      const name = nameEl ? (wAttr(nameEl, 'val') ?? '').toLowerCase() : ''
      const basedOnEl = Array.from(s.getElementsByTagNameNS(W, 'basedOn'))[0]
      const basedOn = basedOnEl ? (wAttr(basedOnEl, 'val') ?? '') : ''

      let headingLevel: number | undefined
      const hm = name.match(/^heading\s*([1-6])$/) ?? name.match(/^标题\s*([1-6])$/)
      if (hm) headingLevel = parseInt(hm[1])
      if (headingLevel === undefined) {
        const bm = basedOn.match(/^Heading([1-6])$/i)
        if (bm) headingLevel = parseInt(bm[1])
      }

      let listType: 'bullet' | 'number' | undefined
      if (name.includes('list bullet') || sid === 'ListBullet') listType = 'bullet'
      if (name.includes('list number') || sid === 'ListNumber') listType = 'number'

      if (headingLevel !== undefined || listType !== undefined) {
        styleMap.set(sid, { headingLevel, listType })
      }
    }
  }

  /** Build CSS string from run properties element */
  function runCss(rPr: Element): string {
    const parts: string[] = []

    const rFonts = wChild(rPr, 'rFonts')
    if (rFonts) {
      const font = wAttr(rFonts, 'ascii') || wAttr(rFonts, 'hAnsi') || wAttr(rFonts, 'eastAsia')
      if (font) parts.push(`font-family:${font}`)
    }

    const sz = wChild(rPr, 'sz')
    if (sz) {
      const hp = parseInt(wAttr(sz, 'val'))
      if (!isNaN(hp) && hp > 0) parts.push(`font-size:${hp / 2}pt`)
    }

    const color = wChild(rPr, 'color')
    if (color) {
      const val = wAttr(color, 'val')
      if (val && val !== 'auto') parts.push(`color:#${val}`)
    }

    return parts.join(';')
  }

  /** Convert a single <w:r> to HTML */
  function runToHtml(r: Element): string {
    const textEls = r.getElementsByTagNameNS(W, 't')
    const text = Array.from(textEls).map(t => t.textContent ?? '').join('')
    if (!text) return ''

    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const rPr = wChild(r, 'rPr')
    if (!rPr) return escaped

    let out = escaped
    const css = runCss(rPr)
    if (css) out = `<span style="${css}">${out}</span>`
    if (wChild(rPr, 'b')) out = `<strong>${out}</strong>`
    if (wChild(rPr, 'i')) out = `<em>${out}</em>`
    if (wChild(rPr, 'u')) out = `<u>${out}</u>`
    if (wChild(rPr, 'strike')) out = `<s>${out}</s>`
    return out
  }

  /** Convert paragraph content (direct <w:r> children) to HTML */
  function paraInnerHtml(p: Element): string {
    const runs: string[] = []
    for (let i = 0; i < p.childNodes.length; i++) {
      const child = p.childNodes[i]
      if (child.nodeType === 1 && (child as Element).localName === 'r') {
        runs.push(runToHtml(child as Element))
      }
    }
    return runs.join('')
  }

  /** Build paragraph CSS from pPr */
  function paraCss(pPr: Element): string {
    const parts: string[] = []

    const jc = wChild(pPr, 'jc')
    if (jc) {
      const val = wAttr(jc, 'val')
      if (val === 'center') parts.push('text-align:center')
      else if (val === 'right') parts.push('text-align:right')
      else if (val === 'both') parts.push('text-align:justify')
    }

    const ind = wChild(pPr, 'ind')
    if (ind) {
      const firstLine = wAttr(ind, 'firstLine')
      if (firstLine) {
        const em = parseInt(firstLine) / 567
        if (em > 0) parts.push(`text-indent:${em.toFixed(2)}em`)
      }
    }

    const spacing = wChild(pPr, 'spacing')
    if (spacing) {
      const line = wAttr(spacing, 'line')
      if (line) {
        const lh = parseInt(line) / 240
        if (!isNaN(lh) && lh > 0) parts.push(`line-height:${lh.toFixed(2)}`)
      }
    }

    return parts.join(';')
  }

  /** Convert <w:p> to HTML tag */
  function paragraphToHtml(p: Element): string {
    const pPr = wChild(p, 'pPr')
    const pStyleEl = pPr ? wChild(pPr, 'pStyle') : null
    const styleId = pStyleEl ? wAttr(pStyleEl, 'val') : ''
    const styleInfo = styleMap.get(styleId)

    const css = pPr ? paraCss(pPr) : ''
    const styleAttr = css ? ` style="${css}"` : ''

    const inner = paraInnerHtml(p)

    // Heading detection: styleMap lookup + well-known IDs
    const knownHeadings: Record<string, number> = {
      heading1: 1, heading2: 2, heading3: 3, heading4: 4, heading5: 5, heading6: 6,
    }
    const headingLevel = styleInfo?.headingLevel ?? knownHeadings[styleId.toLowerCase()]
    if (headingLevel) {
      return `<h${headingLevel}${styleAttr}>${inner}</h${headingLevel}>`
    }

    const listType = styleInfo?.listType
    if (listType === 'bullet') return `<li data-list="bullet"${styleAttr}>${inner}</li>`
    if (listType === 'number') return `<li data-list="number"${styleAttr}>${inner}</li>`

    // numPr means it's a list item
    if (pPr && wChild(pPr, 'numPr')) {
      return `<li data-list="bullet"${styleAttr}>${inner}</li>`
    }

    return `<p${styleAttr}>${inner || '\u00a0'}</p>`
  }

  /** Convert <w:tbl> to HTML */
  function tableToHtml(tbl: Element): string {
    const rows: string[] = []
    for (let i = 0; i < tbl.childNodes.length; i++) {
      const row = tbl.childNodes[i]
      if (row.nodeType !== 1 || (row as Element).localName !== 'tr') continue
      const cells: string[] = []
      for (let j = 0; j < row.childNodes.length; j++) {
        const cell = row.childNodes[j]
        if (cell.nodeType !== 1 || (cell as Element).localName !== 'tc') continue
        const paras: string[] = []
        for (let k = 0; k < cell.childNodes.length; k++) {
          const child = cell.childNodes[k]
          if (child.nodeType === 1 && (child as Element).localName === 'p') {
            paras.push(paragraphToHtml(child as Element))
          }
        }
        cells.push(`<td style="border:1px solid #ccc;padding:4px 8px">${paras.join('')}</td>`)
      }
      rows.push(`<tr>${cells.join('')}</tr>`)
    }
    return `<table style="border-collapse:collapse;width:100%">${rows.join('')}</table>`
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

  for (let i = 0; i < body.childNodes.length; i++) {
    const node = body.childNodes[i]
    if (node.nodeType !== 1) continue
    const el = node as Element

    if (el.localName === 'p') {
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
    } else if (el.localName === 'tbl') {
      flushList()
      htmlParts.push(tableToHtml(el))
    }
  }
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
