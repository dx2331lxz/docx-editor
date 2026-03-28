import mammoth from 'mammoth'
import JSZip from 'jszip'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageOrientation,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx'
import type { AIDocument, AIDocumentNode } from '../types/editor'
import type { PageConfig } from '../components/PageSetup/PageSetupDialog'

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

      // All inline style attrs live in the single `textStyle` mark
      // (TipTap Color, FontFamily, FontSize extensions all extend textStyle)
      const styleAttrs = markAttrs('textStyle') as Record<string, string | null>
      const fontFamily = styleAttrs.fontFamily?.replace(/"/g, '').split(',')[0]?.trim()

      // Font size: stored as "16pt" or "24px"; docx uses half-points
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

      // Color: stored in textStyle.attrs.color as "#RRGGBB" or "rgb(r,g,b)"
      const rawColor = styleAttrs.color ?? undefined
      let color: string | undefined
      if (rawColor) {
        if (rawColor.startsWith('#')) {
          color = rawColor.replace('#', '').toUpperCase()
        } else if (rawColor.startsWith('rgb')) {
          const m = rawColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
          if (m) {
            color = [m[1], m[2], m[3]]
              .map(n => parseInt(n).toString(16).padStart(2, '0'))
              .join('')
              .toUpperCase()
          }
        }
      }

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
        if (child.type === 'paragraph') {
          const childAlign = toAlignment(child.attrs?.textAlign as string | undefined)
          return [new Paragraph({
            alignment: childAlign,
            children: buildRuns(child),
            bullet: { level: 0 },
          })]
        }
        return nodeToParagraphs(child)
      })
    )
  }

  if (node.type === 'orderedList') {
    return (node.content ?? []).flatMap((item) =>
      (item.content ?? []).flatMap((child) => {
        if (child.type === 'paragraph') {
          const childAlign = toAlignment(child.attrs?.textAlign as string | undefined)
          return [new Paragraph({
            alignment: childAlign,
            children: buildRuns(child),
            numbering: { reference: 'default-numbering', level: 0 },
          })]
        }
        return nodeToParagraphs(child)
      })
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

// 1 cm = 567 twips
const CM_TO_TWIP = 567

const PAPER_SIZES_TWIP: Record<string, { width: number; height: number }> = {
  A4:     { width: 11906, height: 16838 },  // 210mm × 297mm
  A3:     { width: 16838, height: 23811 },  // 297mm × 420mm
  Letter: { width: 12240, height: 15840 },  // 8.5in × 11in
}

// ── HTML → docx helpers (used when htmlContent is provided) ─────────────────

/** Parse a CSS inline-style string into a key→value map */
function parseInlineStyle(style: string): Record<string, string> {
  const result: Record<string, string> = {}
  style.split(';').forEach(decl => {
    const idx = decl.indexOf(':')
    if (idx < 0) return
    const prop = decl.slice(0, idx).trim().toLowerCase()
    const val  = decl.slice(idx + 1).trim()
    if (prop && val) result[prop] = val
  })
  return result
}

/** Convert font-size CSS value to half-points (docx unit) */
function parseFontSizeToHalfPt(val?: string): number | undefined {
  if (!val) return undefined
  const n = parseFloat(val)
  if (isNaN(n)) return undefined
  if (val.endsWith('pt'))  return Math.round(n * 2)
  if (val.endsWith('px'))  return Math.round(n * 1.5)
  if (val.endsWith('em'))  return Math.round(n * 24)  // assume 12pt base
  return Math.round(n * 2)  // bare number treated as pt
}

/** Convert CSS color to docx hex string (RRGGBB, no #) */
function parseCssColor(val?: string): string | undefined {
  if (!val) return undefined
  if (val.startsWith('#')) return val.replace('#', '').toUpperCase().slice(0, 6)
  const m = val.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/)
  if (m) {
    return [m[1], m[2], m[3]]
      .map(n => parseInt(n).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  }
  return undefined
}

/** Extract TextRuns from an Element, handling nested inline elements */
function htmlNodeToRuns(el: Element, inherited: {
  bold?: boolean; italics?: boolean; underline?: boolean; strike?: boolean
  color?: string; fontFamily?: string; sizeHalfPt?: number
} = {}): TextRun[] {
  const runs: TextRun[] = []

  el.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? ''
      if (!text) return
      runs.push(new TextRun({
        text,
        bold:      inherited.bold,
        italics:   inherited.italics,
        underline: inherited.underline ? {} : undefined,
        strike:    inherited.strike,
        color:     inherited.color,
        font:      inherited.fontFamily ? { name: inherited.fontFamily } : undefined,
        size:      inherited.sizeHalfPt,
      }))
      return
    }
    if (!(node instanceof Element)) return

    const tag = node.tagName.toLowerCase()
    const style = node.getAttribute('style') ?? ''
    const css = parseInlineStyle(style)

    // Derive formatting for this element
    const ctx = { ...inherited }

    // <br> → hard line break
    if (tag === 'br') {
      runs.push(new TextRun({ break: 1 }))
      return
    }

    if (tag === 'strong' || tag === 'b' || css['font-weight'] === 'bold' || css['font-weight'] === '700') ctx.bold = true
    if (tag === 'em' || tag === 'i' || css['font-style'] === 'italic') ctx.italics = true
    if (tag === 'u' || css['text-decoration']?.includes('underline')) ctx.underline = true
    if (tag === 's' || tag === 'strike' || css['text-decoration']?.includes('line-through')) ctx.strike = true

    const colorVal = parseCssColor(css['color'])
    if (colorVal) ctx.color = colorVal

    const ff = css['font-family']?.replace(/['"]/g, '').split(',')[0]?.trim()
    if (ff) ctx.fontFamily = ff

    const sz = parseFontSizeToHalfPt(css['font-size'])
    if (sz) ctx.sizeHalfPt = sz

    // Recurse into children
    runs.push(...htmlNodeToRuns(node, ctx))
  })

  return runs
}

/** Parse text-align from inline style string */
function parseTextAlign(style: string): AlignmentType {
  const css = parseInlineStyle(style)
  switch (css['text-align']) {
    case 'center':  return AlignmentType.CENTER
    case 'right':   return AlignmentType.RIGHT
    case 'justify': return AlignmentType.JUSTIFIED
    default:        return AlignmentType.LEFT
  }
}

const HTML_HEADING_LEVELS: Record<string, HeadingLevel> = {
  h1: HeadingLevel.HEADING_1,
  h2: HeadingLevel.HEADING_2,
  h3: HeadingLevel.HEADING_3,
  h4: HeadingLevel.HEADING_4,
  h5: HeadingLevel.HEADING_5,
  h6: HeadingLevel.HEADING_6,
}

/** Convert parsed HTML body into docx block elements */
function htmlToDocxChildren(html: string): (Paragraph | Table)[] {
  const domParser = new DOMParser()
  const parsed = domParser.parseFromString(html, 'text/html')
  const children: (Paragraph | Table)[] = []

  const processNode = (node: Element) => {
    const tag = node.tagName.toLowerCase()
    const style = node.getAttribute('style') ?? ''
    const align = parseTextAlign(style)

    // Headings
    if (tag in HTML_HEADING_LEVELS) {
      const paraStyle = parseInlineStyle(style)
      // 如果标题没有显式设置颜色，强制使用黑色（避免 Word 标题样式默认蓝色）
      const explicitColor = parseCssColor(paraStyle['color'])
      const paraInherited = {
        color: explicitColor || '000000', // 强制黑色
        ...(paraStyle['font-family']?.replace(/['"]/g, '').split(',')[0]?.trim() ? { fontFamily: paraStyle['font-family']!.replace(/['"]/g, '').split(',')[0].trim() } : {}),
        ...(parseFontSizeToHalfPt(paraStyle['font-size'])                       ? { sizeHalfPt: parseFontSizeToHalfPt(paraStyle['font-size'])! } : {}),
      }

      // Scan spans for font/size/color fallback (same as paragraph)
      if (!paraInherited.fontFamily || !paraInherited.sizeHalfPt) {
        const firstSpan = node.querySelector('span')
        if (firstSpan) {
          const spanCss = parseInlineStyle(firstSpan.getAttribute('style') ?? '')
          if (!paraInherited.fontFamily) {
            const ff = spanCss['font-family']?.replace(/['"]/g, '').split(',')[0]?.trim()
            if (ff) paraInherited.fontFamily = ff
          }
          if (!paraInherited.sizeHalfPt) {
            const sz = parseFontSizeToHalfPt(spanCss['font-size'])
            if (sz) paraInherited.sizeHalfPt = sz
          }
        }
      }

      // Line spacing and paragraph spacing for headings
      let headingSpacing: { line?: number; lineRule?: 'auto'; before?: number; after?: number } | undefined
      // Check <p/h> own style first, then scan spans
      let resolvedLh: number | undefined
      const hLhRaw = paraStyle['line-height']
      if (hLhRaw) { const v = parseFloat(hLhRaw); if (!isNaN(v) && v > 0) resolvedLh = v }
      if (!resolvedLh) {
        for (const span of Array.from(node.querySelectorAll('span'))) {
          const sc = parseInlineStyle(span.getAttribute('style') ?? '')
          if (sc['line-height']) { const v = parseFloat(sc['line-height']); if (!isNaN(v) && v > 0) { resolvedLh = v; break } }
        }
      }
      const hmtRaw = paraStyle['margin-top']
      const hmbRaw = paraStyle['margin-bottom']
      if (resolvedLh || hmtRaw || hmbRaw) {
        headingSpacing = {}
        if (resolvedLh) { headingSpacing.line = Math.round(resolvedLh * 240); headingSpacing.lineRule = 'auto' }
        if (hmtRaw) { const pt = parseFloat(hmtRaw); if (!isNaN(pt)) headingSpacing.before = Math.round(pt * 20) }
        if (hmbRaw) { const pt = parseFloat(hmbRaw); if (!isNaN(pt)) headingSpacing.after = Math.round(pt * 20) }
      }

      children.push(new Paragraph({
        heading: HTML_HEADING_LEVELS[tag],
        alignment: align,
        spacing: headingSpacing,
        children: htmlNodeToRuns(node, paraInherited),
      }))
      return
    }

    // Paragraph
    if (tag === 'p') {
      const lineStyle = parseInlineStyle(style)

      // ── Line spacing ──────────────────────────────────────────────────────
      // Priority 1: line-height on <p> itself
      let resolvedLineHeight: number | undefined
      const lhRaw = lineStyle['line-height']
      if (lhRaw) {
        const lh = parseFloat(lhRaw)
        if (!isNaN(lh) && lh > 0) resolvedLineHeight = lh
      }
      // Priority 2: scan ALL spans — TipTap's setLineHeight stores it on textStyle spans
      if (!resolvedLineHeight) {
        const allSpans = Array.from(node.querySelectorAll('span'))
        for (const span of allSpans) {
          const spanCss = parseInlineStyle(span.getAttribute('style') ?? '')
          const spanLh = spanCss['line-height']
          if (spanLh) {
            const lh = parseFloat(spanLh)
            if (!isNaN(lh) && lh > 0) {
              resolvedLineHeight = lh
              break
            }
          }
        }
      }
      const spacing: {
        line?: number; lineRule?: 'auto' | 'atLeast' | 'exact'
        before?: number; after?: number
      } = {}
      if (resolvedLineHeight) {
        spacing.line = Math.round(resolvedLineHeight * 240)
        spacing.lineRule = 'auto'
      }

      // Paragraph before/after spacing (from ParagraphSpacing extension)
      // Stored as margin-top / margin-bottom in pt on the <p> element
      const mtRaw = lineStyle['margin-top']
      const mbRaw = lineStyle['margin-bottom']
      if (mtRaw) {
        const pt = parseFloat(mtRaw)
        if (!isNaN(pt) && pt >= 0) spacing.before = Math.round(pt * 20) // pt → twip (1pt=20twip)
      }
      if (mbRaw) {
        const pt = parseFloat(mbRaw)
        if (!isNaN(pt) && pt >= 0) spacing.after = Math.round(pt * 20)
      }

      // ── First-line indent ─────────────────────────────────────────────────
      let indent: { firstLine?: number } | undefined
      const tiRaw = lineStyle['text-indent']
      if (tiRaw) {
        if (tiRaw.endsWith('em')) {
          const em = parseFloat(tiRaw)
          if (!isNaN(em)) indent = { firstLine: Math.round(em * 240) }
        } else if (tiRaw.endsWith('px')) {
          const px = parseFloat(tiRaw)
          if (!isNaN(px)) indent = { firstLine: Math.round(px * 15) }
        } else if (tiRaw.endsWith('cm')) {
          const cm = parseFloat(tiRaw)
          if (!isNaN(cm)) indent = { firstLine: Math.round(cm * 567) }
        }
      }

      // ── Paragraph-level font/size/color — scan first span as fallback ─────
      // When the whole paragraph uses one font/size set via toolbar, TipTap
      // wraps all text in a single <span style="font-family:...; font-size:...">
      // We use these as inherited defaults so bare text nodes also get styled.
      const paraInherited: {
        color?: string; fontFamily?: string; sizeHalfPt?: number
      } = {}

      // First pick up any p-level values
      if (parseCssColor(lineStyle['color'])) paraInherited.color = parseCssColor(lineStyle['color'])!
      const pFf = lineStyle['font-family']?.replace(/['"]/g, '').split(',')[0]?.trim()
      if (pFf) paraInherited.fontFamily = pFf
      const pSz = parseFontSizeToHalfPt(lineStyle['font-size'])
      if (pSz) paraInherited.sizeHalfPt = pSz

      // Then try first span for font/size/color if not yet found on <p>
      if (!paraInherited.fontFamily || !paraInherited.sizeHalfPt) {
        const firstSpan = node.querySelector('span')
        if (firstSpan) {
          const spanCss = parseInlineStyle(firstSpan.getAttribute('style') ?? '')
          if (!paraInherited.fontFamily) {
            const ff = spanCss['font-family']?.replace(/['"]/g, '').split(',')[0]?.trim()
            if (ff) paraInherited.fontFamily = ff
          }
          if (!paraInherited.sizeHalfPt) {
            const sz = parseFontSizeToHalfPt(spanCss['font-size'])
            if (sz) paraInherited.sizeHalfPt = sz
          }
          if (!paraInherited.color) {
            const col = parseCssColor(spanCss['color'])
            if (col) paraInherited.color = col
          }
        }
      }

      children.push(new Paragraph({
        alignment: align,
        spacing: Object.keys(spacing).length > 0 ? spacing : undefined,
        indent,
        children: htmlNodeToRuns(node, paraInherited),
      }))
      return
    }

    // Unordered list
    if (tag === 'ul') {
      node.querySelectorAll(':scope > li').forEach(li => {
        children.push(new Paragraph({
          bullet: { level: 0 },
          children: htmlNodeToRuns(li),
        }))
      })
      return
    }

    // Ordered list
    if (tag === 'ol') {
      node.querySelectorAll(':scope > li').forEach(li => {
        children.push(new Paragraph({
          numbering: { reference: 'default-numbering', level: 0 },
          children: htmlNodeToRuns(li),
        }))
      })
      return
    }

    // Table
    if (tag === 'table') {
      const rows = Array.from(node.querySelectorAll('tr')).map(tr => {
        const cells = Array.from(tr.querySelectorAll('td, th')).map(td => {
          const cellParas = Array.from(td.children).flatMap(child => {
            const childEl = child as Element
            const childTag = childEl.tagName.toLowerCase()
            if (['p', 'h1','h2','h3','h4','h5','h6'].includes(childTag)) {
              processNode(childEl)
              const last = children.pop()
              return last ? [last] : []
            }
            return [new Paragraph({ children: htmlNodeToRuns(childEl) })]
          })
          return new TableCell({
            children: cellParas.length > 0 ? cellParas as Paragraph[] : [new Paragraph({ children: [] })],
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
      if (rows.length > 0) {
        children.push(new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }))
      }
      return
    }

    // Blockquote / div — recurse into children
    Array.from(node.children).forEach(child => processNode(child as Element))
  }

  Array.from(parsed.body.children).forEach(child => processNode(child as Element))
  return children
}

/** Export TipTap JSON document to a .docx Blob */
export async function exportDocx(doc: AIDocument, pageConfig?: PageConfig, htmlContent?: string): Promise<Blob> {
  // Prefer HTML path (full fidelity) when caller provides editor.getHTML()
  const children = htmlContent
    ? htmlToDocxChildren(htmlContent)
    : doc.content.flatMap(nodeToParagraphs)

  const cfg: PageConfig = pageConfig ?? {
    paperSize: 'A4',
    orientation: 'portrait',
    marginTop: 2.54,
    marginBottom: 2.54,
    marginLeft: 2.54,
    marginRight: 2.54,
  }

  const { width, height } = PAPER_SIZES_TWIP[cfg.paperSize] ?? PAPER_SIZES_TWIP['A4']
  const isLandscape = cfg.orientation === 'landscape'

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
    sections: [{
      properties: {
        page: {
          size: {
            width:  isLandscape ? height : width,
            height: isLandscape ? width  : height,
            orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
          },
          margin: {
            top:    Math.round(cfg.marginTop    * CM_TO_TWIP),
            bottom: Math.round(cfg.marginBottom * CM_TO_TWIP),
            left:   Math.round(cfg.marginLeft   * CM_TO_TWIP),
            right:  Math.round(cfg.marginRight  * CM_TO_TWIP),
          },
        },
      },
      children,
    }],
  })
  return Packer.toBlob(document)
}
