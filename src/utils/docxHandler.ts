import mammoth from 'mammoth'
import JSZip from 'jszip'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  HeadingLevel,
  AlignmentType,
  PageOrientation,
  ShadingType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx'
import type { AIDocument, AIDocumentNode } from '../types/editor'
import type { PageConfig } from '../components/PageSetup/PageSetupDialog'

// ── Import helpers ───────────────────────────────────────────────────────────

interface ParaStyleEntry {
  lineHeight?: number      // multiplier (lineRule=auto only): line/240
  lineHeightPt?: number    // absolute pt (lineRule=exact/atLeast): line/20
  spaceBefore?: number     // twip
  spaceAfter?: number      // twip
  textAlign?: string       // 'left'|'center'|'right'|'justify'
  firstLineIndent?: number // twip (from w:firstLine)
  firstLineIndentEm?: number // em (from w:firstLineChars, e.g. 200 → 2em)
  leftIndent?: number      // twip
}

interface RunStyleEntry {
  fontFamily?: string
  fontSize?: number   // pt
  bold?: boolean
  italic?: boolean
  color?: string
}

interface StyleEntry {
  headingLevel?: number
  listType?: 'bullet' | 'number'
  basedOn?: string
  paraStyle?: ParaStyleEntry
  runStyle?: RunStyleEntry
}

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

  /** Merge two partial style objects, only overriding with defined values */
  function mergeObj<T extends object>(base: T, override?: Partial<T>): T {
    if (!override) return { ...base }
    const merged = { ...base }
    ;(Object.keys(override) as Array<keyof T>).forEach(key => {
      if (override[key] !== undefined) merged[key] = override[key] as T[keyof T]
    })
    return merged
  }

  /** Extract ParaStyleEntry from a <w:pPr> element */
  function extractParaStyle(pPr: Element): ParaStyleEntry {
    const result: ParaStyleEntry = {}

    const jc = wChild(pPr, 'jc')
    if (jc) {
      const val = wAttr(jc, 'val')
      if (val === 'center') result.textAlign = 'center'
      else if (val === 'right') result.textAlign = 'right'
      else if (val === 'both') result.textAlign = 'justify'
      else if (val === 'left') result.textAlign = 'left'
    }

    const ind = wChild(pPr, 'ind')
    if (ind) {
      // firstLineChars: in 1/100 of a character width (200 = 2 chars = 2em)
      const flChars = parseInt(wAttr(ind, 'firstLineChars'))
      if (!isNaN(flChars) && flChars > 0) {
        result.firstLineIndentEm = flChars / 100
      } else {
        // firstLine: in twip
        const fl = parseInt(wAttr(ind, 'firstLine'))
        if (!isNaN(fl) && fl > 0) result.firstLineIndent = fl
      }
      const left = parseInt(wAttr(ind, 'left'))
      if (!isNaN(left) && left > 0) result.leftIndent = left
    }

    const spacing = wChild(pPr, 'spacing')
    if (spacing) {
      const lineVal = wAttr(spacing, 'line')
      const lineRule = wAttr(spacing, 'lineRule')
      if (lineVal) {
        const lineNum = parseInt(lineVal)
        if (!isNaN(lineNum)) {
          if (!lineRule || lineRule === 'auto') {
            // lineRule=auto: line/240 = multiplier (e.g. 276/240 = 1.15)
            const lh = lineNum / 240
            if (lh >= 0.8 && lh <= 5.0) result.lineHeight = lh
          } else {
            // lineRule=exact/atLeast: line/20 = absolute pt value
            const pt = lineNum / 20
            if (pt > 0) result.lineHeightPt = pt
          }
        }
      }
      const beforeVal = wAttr(spacing, 'before')
      if (beforeVal) {
        const before = parseInt(beforeVal)
        if (!isNaN(before)) result.spaceBefore = before
      }
      const afterVal = wAttr(spacing, 'after')
      if (afterVal) {
        const after = parseInt(afterVal)
        if (!isNaN(after)) result.spaceAfter = after
      }
    }

    return result
  }

  /** Extract RunStyleEntry from a <w:rPr> element */
  function extractRunStyle(rPr: Element): RunStyleEntry {
    const result: RunStyleEntry = {}

    const rFonts = wChild(rPr, 'rFonts')
    if (rFonts) {
      const eastAsia = wAttr(rFonts, 'eastAsia')
      const ascii = wAttr(rFonts, 'ascii') || wAttr(rFonts, 'hAnsi')
      const font = eastAsia || ascii
      if (font) result.fontFamily = font
    }

    const sz = wChild(rPr, 'sz')
    const szCs = wChild(rPr, 'szCs')
    if (sz) {
      const hp = parseInt(wAttr(sz, 'val'))
      if (!isNaN(hp) && hp > 0) result.fontSize = hp / 2
    } else if (szCs) {
      // fallback: Complex Script size (some CJK docs use szCs instead of sz)
      const hp = parseInt(wAttr(szCs, 'val'))
      if (!isNaN(hp) && hp > 0) result.fontSize = hp / 2
    }

    const color = wChild(rPr, 'color')
    if (color) {
      const val = wAttr(color, 'val')
      if (val && val !== 'auto') result.color = `#${val}`
    }

    if (wChild(rPr, 'b')) result.bold = true
    if (wChild(rPr, 'i')) result.italic = true

    return result
  }

  // docDefaults: lowest-priority base styles from w:docDefaults
  const docDefaults: { paraStyle: ParaStyleEntry; runStyle: RunStyleEntry } = {
    paraStyle: {},
    runStyle: {},
  }

  // Build styleMap: styleId → StyleEntry (full pPr/rPr + inheritance info)
  const styleMap = new Map<string, StyleEntry>()

  if (stylesDom) {
    // Read w:docDefaults
    const docDefaultsEl = stylesDom.getElementsByTagNameNS(W, 'docDefaults')[0] as Element | undefined
    if (docDefaultsEl) {
      const pPrDefaultEl = wChild(docDefaultsEl, 'pPrDefault')
      if (pPrDefaultEl) {
        const pPrEl = wChild(pPrDefaultEl, 'pPr')
        if (pPrEl) docDefaults.paraStyle = extractParaStyle(pPrEl)
      }
      const rPrDefaultEl = wChild(docDefaultsEl, 'rPrDefault')
      if (rPrDefaultEl) {
        const rPrEl = wChild(rPrDefaultEl, 'rPr')
        if (rPrEl) docDefaults.runStyle = extractRunStyle(rPrEl)
      }
    }

    // Read all w:style elements
    const styleEls = Array.from(stylesDom.getElementsByTagNameNS(W, 'style'))
    for (const s of styleEls) {
      const sid = wAttr(s, 'styleId')
      if (!sid) continue

      const nameEl = s.getElementsByTagNameNS(W, 'name')[0] as Element | undefined
      const name = nameEl ? wAttr(nameEl, 'val').toLowerCase() : ''
      const basedOnEl = s.getElementsByTagNameNS(W, 'basedOn')[0] as Element | undefined
      const basedOn = basedOnEl ? wAttr(basedOnEl, 'val') : ''

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

      const entry: StyleEntry = {}
      if (headingLevel !== undefined) entry.headingLevel = headingLevel
      if (listType !== undefined) entry.listType = listType
      if (basedOn) entry.basedOn = basedOn

      const pPrEl = wChild(s, 'pPr')
      if (pPrEl) {
        const ps = extractParaStyle(pPrEl)
        if (Object.keys(ps).length > 0) entry.paraStyle = ps
      }

      const rPrEl = wChild(s, 'rPr')
      if (rPrEl) {
        const rs = extractRunStyle(rPrEl)
        if (Object.keys(rs).length > 0) entry.runStyle = rs
      }

      styleMap.set(sid, entry)
    }
  }

  /** Resolve full inherited style for a styleId (docDefaults → basedOn chain → own style) */
  function resolveStyle(styleId: string): { paraStyle: ParaStyleEntry; runStyle: RunStyleEntry } {
    const visited = new Set<string>()

    function inner(id: string): { paraStyle: ParaStyleEntry; runStyle: RunStyleEntry } {
      if (!id || visited.has(id)) {
        return { paraStyle: { ...docDefaults.paraStyle }, runStyle: { ...docDefaults.runStyle } }
      }
      visited.add(id)

      const entry = styleMap.get(id)
      if (!entry) {
        return { paraStyle: { ...docDefaults.paraStyle }, runStyle: { ...docDefaults.runStyle } }
      }

      const base = entry.basedOn
        ? inner(entry.basedOn)
        : { paraStyle: { ...docDefaults.paraStyle }, runStyle: { ...docDefaults.runStyle } }

      return {
        paraStyle: mergeObj(base.paraStyle, entry.paraStyle),
        runStyle: mergeObj(base.runStyle, entry.runStyle),
      }
    }

    return inner(styleId)
  }

  /** Convert ParaStyleEntry to a CSS string */
  function paraStyleToCss(ps: ParaStyleEntry): string {
    const parts: string[] = []

    if (ps.textAlign) parts.push(`text-align:${ps.textAlign}`)

    if (ps.firstLineIndentEm !== undefined && ps.firstLineIndentEm > 0) {
      parts.push(`text-indent:${ps.firstLineIndentEm.toFixed(2)}em`)
    } else if (ps.firstLineIndent !== undefined) {
      const em = ps.firstLineIndent / 567
      if (em > 0) parts.push(`text-indent:${em.toFixed(2)}em`)
    }

    if (ps.leftIndent !== undefined) {
      const em = ps.leftIndent / 567
      if (em > 0) parts.push(`margin-left:${em.toFixed(2)}em`)
    }

    if (ps.lineHeight !== undefined) {
      parts.push(`line-height:${ps.lineHeight.toFixed(2)}`)
    } else if (ps.lineHeightPt !== undefined) {
      parts.push(`line-height:${ps.lineHeightPt.toFixed(1)}pt`)
    }

    if (ps.spaceBefore !== undefined) {
      parts.push(`margin-top:${(ps.spaceBefore / 20).toFixed(1)}pt`)
    }

    if (ps.spaceAfter !== undefined) {
      parts.push(`margin-bottom:${(ps.spaceAfter / 20).toFixed(1)}pt`)
    }

    return parts.join(';')
  }

  /** Convert RunStyleEntry to a CSS string */
  function runStyleToCss(rs: RunStyleEntry): string {
    const parts: string[] = []
    if (rs.fontFamily) parts.push(`font-family:${rs.fontFamily}`)
    if (rs.fontSize) parts.push(`font-size:${rs.fontSize}pt`)
    if (rs.color) parts.push(`color:${rs.color}`)
    return parts.join(';')
  }

  /** Convert a single <w:r> to HTML, using inheritedRun as fallback for font/size/color */
  function runToHtml(r: Element, inheritedRun?: RunStyleEntry): string {
    const textEls = r.getElementsByTagNameNS(W, 't')
    const text = Array.from(textEls).map(t => t.textContent ?? '').join('')
    if (!text) return ''

    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const rPr = wChild(r, 'rPr')
    const directRun = rPr ? extractRunStyle(rPr) : {}

    // For font/size/color: merge inherited (style) with direct (run's own rPr)
    // For bold/italic: only use the run's own rPr — style-inherited bold/italic
    // should not apply to individual runs (it's meant for style-level defaults like headings)
    const mergedVisual: RunStyleEntry = {
      fontFamily: directRun.fontFamily ?? inheritedRun?.fontFamily,
      fontSize: directRun.fontSize ?? inheritedRun?.fontSize,
      color: directRun.color ?? inheritedRun?.color,
    }

    let out = escaped
    const css = runStyleToCss(mergedVisual)
    if (css) out = `<span style="${css}">${out}</span>`
    // Bold/italic: only from the run's own rPr, not inherited style
    if (rPr && wChild(rPr, 'b')) out = `<strong>${out}</strong>`
    if (rPr && wChild(rPr, 'i')) out = `<em>${out}</em>`
    if (rPr && wChild(rPr, 'u')) out = `<u>${out}</u>`
    if (rPr && wChild(rPr, 'strike')) out = `<s>${out}</s>`
    return out
  }

  /** Convert paragraph content (direct <w:r> children) to HTML */
  function paraInnerHtml(p: Element, inheritedRun?: RunStyleEntry): string {
    const runs: string[] = []
    for (let i = 0; i < p.childNodes.length; i++) {
      const child = p.childNodes[i]
      if (child.nodeType === 1 && (child as Element).localName === 'r') {
        runs.push(runToHtml(child as Element, inheritedRun))
      }
    }
    return runs.join('')
  }

  /** Convert <w:p> to HTML tag */
  function paragraphToHtml(p: Element): string {
    const pPr = wChild(p, 'pPr')
    const pStyleEl = pPr ? wChild(pPr, 'pStyle') : null
    const styleId = pStyleEl ? wAttr(pStyleEl, 'val') : ''
    const styleInfo = styleMap.get(styleId)

    // Resolve inherited styles, then override with direct pPr values
    const resolved = resolveStyle(styleId)
    const directPara = pPr ? extractParaStyle(pPr) : {}
    const mergedPara = mergeObj<ParaStyleEntry>(resolved.paraStyle, directPara)

    const css = paraStyleToCss(mergedPara)
    const styleAttr = css ? ` style="${css}"` : ''

    const inner = paraInnerHtml(p, resolved.runStyle)

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
function toHeadingLevel(level?: number): typeof HeadingLevel[keyof typeof HeadingLevel] {
  const map: Record<number, typeof HeadingLevel[keyof typeof HeadingLevel]> = {
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

      // Color
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

      // Text background color (BackgroundColor extension)
      const rawBg = styleAttrs.backgroundColor ?? undefined
      const bgHex = rawBg ? parseCssColor(rawBg) : undefined

      // Letter spacing: stored as bare number (px), e.g. "2" → 2px
      // docx characterSpacing is in twentieths of a point; 1px ≈ 0.75pt = 15 twip
      let characterSpacing: number | undefined
      const lsRaw = styleAttrs.letterSpacing ?? ''
      if (lsRaw) {
        const lsPx = parseFloat(lsRaw)
        if (!isNaN(lsPx)) characterSpacing = Math.round(lsPx * 15)
      }

      return new TextRun({
        text:             child.text ?? '',
        bold:             hasMark('bold') || undefined,
        italics:          hasMark('italic') || undefined,
        underline:        hasMark('underline') ? {} : undefined,
        strike:           hasMark('strike') || undefined,
        superScript:      hasMark('superscript') || undefined,
        subScript:        hasMark('subscript') || undefined,
        color,
        font:             fontFamily ? { name: fontFamily } : undefined,
        size:             sizeHalfPt,
        characterSpacing,
        // Text highlight (Highlight mark with color attr)
        ...(hasMark('highlight') ? { highlight: cssColorToHighlight(
          (markAttrs('highlight') as Record<string, string>).color ?? '#ffff00'
        ) as never } : {}),
        // Text background shading
        ...(bgHex ? { shading: { type: ShadingType.CLEAR, fill: bgHex } } : {}),
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

  // ── Shared spacing builder (used by heading + paragraph) ────────────────
  const buildSpacing = (attrs: Record<string, unknown>): {
    line?: number; lineRule?: 'auto'; before?: number; after?: number
  } => {
    const lineHeight = attrs.lineHeight as string | undefined
    const lhNum = lineHeight ? parseFloat(lineHeight) : NaN
    // Only set line spacing if explicitly provided; do NOT default to 1.6 (would inflate imported docs)
    const result: { line?: number; lineRule?: 'auto'; before?: number; after?: number } = {}
    if (!isNaN(lhNum) && lhNum > 0) {
      result.line = Math.round(lhNum * 240)
      result.lineRule = 'auto'
    }
    const mt = attrs.marginTop as number | undefined
    const mb = attrs.marginBottom as number | undefined
    if (mt != null && mt > 0) result.before = Math.round(mt * 20)
    if (mb != null && mb > 0) result.after  = Math.round(mb * 20)
    return result
  }

  // ── Shared indent builder ────────────────────────────────────────────────
  const buildIndent = (attrs: Record<string, unknown>): {
    firstLine?: number; left?: number; right?: number
  } | undefined => {
    const fi = attrs.firstLineIndent as number | undefined
    const pl = attrs.paddingLeft     as number | undefined  // cm
    const pr = attrs.paddingRight    as number | undefined  // cm
    if (!fi && !pl && !pr) return undefined
    const res: { firstLine?: number; left?: number; right?: number } = {}
    if (fi) res.firstLine = Math.round(fi * 2 * 240)  // level → 2em → twip (12pt base)
    if (pl) res.left      = Math.round(pl * 567)       // cm → twip
    if (pr) res.right     = Math.round(pr * 567)
    return res
  }

  // ── Shared shading builder ───────────────────────────────────────────────
  const buildShading = (attrs: Record<string, unknown>) => {
    const bg = attrs.backgroundColor as string | undefined
    if (!bg) return {}
    const hex = parseCssColor(bg)
    return hex ? { shading: { type: ShadingType.CLEAR, fill: hex } } : {}
  }

  if (node.type === 'heading') {
    const attrs = (node.attrs ?? {}) as Record<string, unknown>
    return [
      new Paragraph({
        heading: toHeadingLevel(attrs.level as number | undefined),
        alignment: align,
        spacing: buildSpacing(attrs),
        indent: buildIndent(attrs),
        ...buildShading(attrs),
        children: buildRuns(node),
      }),
    ]
  }

  if (node.type === 'paragraph') {
    const attrs = (node.attrs ?? {}) as Record<string, unknown>
    return [
      new Paragraph({
        alignment: align,
        spacing: buildSpacing(attrs),
        indent: buildIndent(attrs),
        ...buildShading(attrs),
        children: buildRuns(node),
      }),
    ]
  }

  if (node.type === 'bulletList') {
    return (node.content ?? []).flatMap((item) =>
      (item.content ?? []).flatMap((child) => {
        if (child.type === 'paragraph') {
          const childAlign = toAlignment(child.attrs?.textAlign as string | undefined)
          const childAttrs = (child.attrs ?? {}) as Record<string, unknown>
          return [new Paragraph({
            alignment: childAlign,
            spacing: buildSpacing(childAttrs),
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
          const childAttrs = (child.attrs ?? {}) as Record<string, unknown>
          return [new Paragraph({
            alignment: childAlign,
            spacing: buildSpacing(childAttrs),
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

/** Alias for parseCssColor — explicit usage as hex color */
function cssHexColor(val?: string): string | undefined {
  return parseCssColor(val)
}

// Named highlight colors supported by docx (Word) — map CSS hex/name to closest
const HIGHLIGHT_MAP: Array<{ hex: string; name: string }> = [
  { hex: 'FFFF00', name: 'yellow' },
  { hex: '00FF00', name: 'green' },
  { hex: '00FFFF', name: 'cyan' },
  { hex: 'FF00FF', name: 'magenta' },
  { hex: '0000FF', name: 'blue' },
  { hex: 'FF0000', name: 'red' },
  { hex: '000080', name: 'darkBlue' },
  { hex: '008080', name: 'darkCyan' },
  { hex: '008000', name: 'darkGreen' },
  { hex: '800080', name: 'darkMagenta' },
  { hex: '800000', name: 'darkRed' },
  { hex: '808000', name: 'darkYellow' },
  { hex: '808080', name: 'darkGray' },
  { hex: 'C0C0C0', name: 'lightGray' },
  { hex: '000000', name: 'black' },
  { hex: 'FFFFFF', name: 'white' },
]

/** Map a CSS color value to the nearest docx HighlightColor name */
function cssColorToHighlight(cssColor: string): string {
  const hex = parseCssColor(cssColor)
  if (!hex) return 'yellow'

  // Exact match first
  const exact = HIGHLIGHT_MAP.find(h => h.hex === hex.toUpperCase())
  if (exact) return exact.name

  // Nearest color by Euclidean distance in RGB space
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  let best = 'yellow', bestDist = Infinity
  for (const { hex: hh, name } of HIGHLIGHT_MAP) {
    const dr = r - parseInt(hh.slice(0, 2), 16)
    const dg = g - parseInt(hh.slice(2, 4), 16)
    const db = b - parseInt(hh.slice(4, 6), 16)
    const dist = dr * dr + dg * dg + db * db
    if (dist < bestDist) { bestDist = dist; best = name }
  }
  return best
}

/** Build an ImageRun from an <img> element (base64 src supported) */
function buildImageRun(img: HTMLImageElement): ImageRun | null {
  const src = img.getAttribute('src') ?? ''
  if (!src) return null

  // Only handle data URLs for now (base64 embedded images)
  const dataMatch = src.match(/^data:image\/(png|jpg|jpeg|gif|bmp);base64,(.+)$/i)
  if (!dataMatch) return null

  const rawType = dataMatch[1].toLowerCase()
  const type = rawType === 'jpeg' ? 'jpg' : rawType as 'png' | 'jpg' | 'gif' | 'bmp'
  const data = dataMatch[2]

  // Read width from attribute or style
  let widthPx = parseInt(img.getAttribute('width') ?? '0') || 0
  if (!widthPx) {
    const css = parseInlineStyle(img.getAttribute('style') ?? '')
    const wRaw = css['width']
    if (wRaw) widthPx = parseInt(wRaw) || 0
  }

  // Default to 400px wide if unknown
  if (!widthPx || widthPx > 600) widthPx = 400

  // Estimate height from aspect ratio if possible, else square
  let heightPx = parseInt(img.getAttribute('height') ?? '0') || 0
  if (!heightPx) heightPx = widthPx

  // Convert px to EMU (English Metric Units): 1px ≈ 9525 EMU (96dpi)
  const PX_TO_EMU = 9525
  return new ImageRun({
    type: type as 'jpg' | 'png' | 'gif' | 'bmp',
    data: Uint8Array.from(atob(data), c => c.charCodeAt(0)),
    transformation: {
      width:  widthPx  * PX_TO_EMU,
      height: heightPx * PX_TO_EMU,
    },
  })
}

/** Extract TextRuns from an Element, handling nested inline elements */
function htmlNodeToRuns(el: Element, inherited: {
  bold?: boolean; italics?: boolean; underline?: boolean; strike?: boolean
  color?: string; fontFamily?: string; sizeHalfPt?: number
  superScript?: boolean; subScript?: boolean
  highlight?: string; backgroundColor?: string
  characterSpacing?: number
} = {}): (TextRun | ImageRun)[] {
  const runs: (TextRun | ImageRun)[] = []

  el.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? ''
      if (!text) return
      runs.push(new TextRun({
        text,
        bold:             inherited.bold,
        italics:          inherited.italics,
        underline:        inherited.underline ? {} : undefined,
        strike:           inherited.strike,
        color:            inherited.color,
        font:             inherited.fontFamily ? { name: inherited.fontFamily } : undefined,
        size:             inherited.sizeHalfPt,
        superScript:      inherited.superScript,
        subScript:        inherited.subScript,
        // Text highlight (named color) — best-effort mapping
        ...(inherited.highlight ? { highlight: cssColorToHighlight(inherited.highlight) as never } : {}),
        // Text background via shading
        ...(inherited.backgroundColor ? {
          shading: { type: ShadingType.CLEAR, fill: cssHexColor(inherited.backgroundColor) ?? 'FFFFFF' }
        } : {}),
        characterSpacing: inherited.characterSpacing,
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

    // Inline image
    if (tag === 'img') {
      const imgRun = buildImageRun(node as HTMLImageElement)
      if (imgRun) runs.push(imgRun)
      return
    }

    if (tag === 'strong' || tag === 'b' || css['font-weight'] === 'bold' || css['font-weight'] === '700') ctx.bold = true
    if (tag === 'em' || tag === 'i' || css['font-style'] === 'italic') ctx.italics = true
    if (tag === 'u' || css['text-decoration']?.includes('underline')) ctx.underline = true
    if (tag === 's' || tag === 'strike' || css['text-decoration']?.includes('line-through')) ctx.strike = true
    if (tag === 'sup') ctx.superScript = true
    if (tag === 'sub') ctx.subScript = true
    // <mark> element — highlight with inline color if present, else default yellow
    if (tag === 'mark') ctx.highlight = css['background-color'] ?? '#ffff00'

    const colorVal = parseCssColor(css['color'])
    if (colorVal) ctx.color = colorVal

    const ff = css['font-family']?.replace(/['"]/g, '').split(',')[0]?.trim()
    if (ff) ctx.fontFamily = ff

    const sz = parseFontSizeToHalfPt(css['font-size'])
    if (sz) ctx.sizeHalfPt = sz

    // Text background color (BackgroundColor extension / inline style)
    const bgColor = css['background-color']
    if (bgColor && tag !== 'mark') ctx.backgroundColor = bgColor

    // Letter spacing: TipTap LetterSpacing stores value without "px" suffix,
    // but renderHTML re-adds it → "2px". docx characterSpacing is in twentieths of a point.
    // 1px ≈ 0.75pt → 1px ≈ 15 twentieths-of-pt
    const lsRaw = css['letter-spacing']
    if (lsRaw) {
      const lsPx = parseFloat(lsRaw)
      if (!isNaN(lsPx)) ctx.characterSpacing = Math.round(lsPx * 15)
    }

    // Recurse into children
    runs.push(...htmlNodeToRuns(node, ctx))
  })

  return runs
}

/** Parse CSS length value to twips (1/1440 inch). Supports em/px/cm/pt. */
function parseToTwipSimple(val: string): number | undefined {
  if (val.endsWith('em'))  { const v = parseFloat(val); return isNaN(v) ? undefined : Math.round(v * 240) }
  if (val.endsWith('px'))  { const v = parseFloat(val); return isNaN(v) ? undefined : Math.round(v * 15) }
  if (val.endsWith('cm'))  { const v = parseFloat(val); return isNaN(v) ? undefined : Math.round(v * 567) }
  if (val.endsWith('pt'))  { const v = parseFloat(val); return isNaN(v) ? undefined : Math.round(v * 20) }
  return undefined
}

/** Parse text-align from inline style string */
function parseTextAlign(style: string): typeof AlignmentType[keyof typeof AlignmentType] {
  const css = parseInlineStyle(style)
  switch (css['text-align']) {
    case 'center':  return AlignmentType.CENTER
    case 'right':   return AlignmentType.RIGHT
    case 'justify': return AlignmentType.JUSTIFIED
    default:        return AlignmentType.LEFT
  }
}

const HTML_HEADING_LEVELS: Record<string, typeof HeadingLevel[keyof typeof HeadingLevel]> = {
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
      // Default heading line-height: if not set, do NOT force 1.6 — let Word use its default
      // (avoids inflating line spacing on imported docs that had no explicit line height)

      const hmtRaw = paraStyle['margin-top']
      const hmbRaw = paraStyle['margin-bottom']
      headingSpacing = {}
      if (resolvedLh) {
        headingSpacing.line = Math.round(resolvedLh * 240)
        headingSpacing.lineRule = 'auto'
      }
      if (hmtRaw) { const pt = parseFloat(hmtRaw); if (!isNaN(pt)) headingSpacing.before = Math.round(pt * 20) }
      if (hmbRaw) { const pt = parseFloat(hmbRaw); if (!isNaN(pt)) headingSpacing.after = Math.round(pt * 20) }

      // Heading background color
      const hBgColor = paraStyle['background-color'] ?? node.getAttribute('data-bg-color') ?? undefined
      const hShadingProp = hBgColor ? {
        shading: { type: ShadingType.CLEAR, fill: cssHexColor(hBgColor) ?? 'FFFFFF' }
      } : {}

      // Heading indent: padding-left/right (ParagraphSpacing can apply to headings)
      const hPlRaw = paraStyle['padding-left']
      const hPrRaw = paraStyle['padding-right']
      const hIndent = (hPlRaw || hPrRaw) ? {
        ...(hPlRaw ? { left:  parseToTwipSimple(hPlRaw) } : {}),
        ...(hPrRaw ? { right: parseToTwipSimple(hPrRaw) } : {}),
      } : undefined

      children.push(new Paragraph({
        heading: HTML_HEADING_LEVELS[tag],
        alignment: align,
        spacing: headingSpacing,
        indent: hIndent,
        ...hShadingProp,
        children: htmlNodeToRuns(node, paraInherited),
      }))
      return
    }

    // Paragraph
    if (tag === 'p') {
      const lineStyle = parseInlineStyle(style)

      // ── Line spacing ──────────────────────────────────────────────────────
      // Priority 1: line-height directly on <p> (LineHeight now configured for paragraph nodes)
      let resolvedLineHeight: number | undefined
      const lhRaw = lineStyle['line-height']
      if (lhRaw) {
        const lh = parseFloat(lhRaw)
        if (!isNaN(lh) && lh > 0) resolvedLineHeight = lh
      }
      // Priority 2: scan ALL spans — fallback for old data where line-height was on textStyle spans
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
      // Priority 3: no explicit line-height → do NOT force a value; let Word use its default
      // (forcing 1.6 here caused imported docs to export with larger line spacing than original)

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

      // ── First-line indent + left/right indent ────────────────────────────
      let indent: { firstLine?: number; left?: number; right?: number } | undefined
      const tiRaw = lineStyle['text-indent']
      const plRaw = lineStyle['padding-left']
      const prRaw = lineStyle['padding-right']

      if (tiRaw || plRaw || prRaw) {
        indent = {}
        if (tiRaw) { const v = parseToTwipSimple(tiRaw); if (v !== undefined) indent.firstLine = v }
        if (plRaw) { const v = parseToTwipSimple(plRaw);  if (v !== undefined) indent.left = v }
        if (prRaw) { const v = parseToTwipSimple(prRaw);  if (v !== undefined) indent.right = v }
      }

      // ── Paragraph background color (ParagraphShading extension) ──────────
      const pBgColor = lineStyle['background-color'] ?? node.getAttribute('data-bg-color') ?? undefined
      const shadingProp = pBgColor ? {
        shading: { type: ShadingType.CLEAR, fill: cssHexColor(pBgColor) ?? 'FFFFFF' }
      } : {}

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
        ...shadingProp,
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
    // Standalone image (block-level)
    if (tag === 'img') {
      const imgRun = buildImageRun(node as HTMLImageElement)
      if (imgRun) {
        children.push(new Paragraph({ children: [imgRun] }))
      }
      return
    }

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

  // Default run style: match the editor's CSS defaults (14pt, SimSun)
  // This ensures paragraphs without explicit font/size marks render consistently in Word.
  const DEFAULT_FONT_NAME = 'SimSun'   // editor shows 宋体 as default
  const DEFAULT_SIZE_HP   = 28         // 14pt × 2 = 28 half-points

  // Heading run style applied to all heading levels:
  // - bold: true  (docx lib's default Heading styles omit <w:b/>, so Word renders them as non-bold)
  // - color: 000000  (override the default blue color from docx lib's Heading styles)
  // - font: SimSun  (consistent with document default font)
  const headingRunStyle = {
    bold:  true,
    color: '000000',
    font:  { name: DEFAULT_FONT_NAME, eastAsia: DEFAULT_FONT_NAME } as { name: string; eastAsia: string },
  }

  const document = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: { name: DEFAULT_FONT_NAME, eastAsia: DEFAULT_FONT_NAME },
            size: DEFAULT_SIZE_HP,
          },
        },
        // Heading sizes match editor CSS: base 14pt × em multiplier → half-points
        // h1: 2em    = 28pt = 56hp  h2: 1.5em  = 21pt = 42hp
        // h3: 1.17em ≈ 16.4pt = 33hp  h4: 1em = 14pt = 28hp
        // h5: 0.83em ≈ 11.6pt = 23hp  h6: 0.67em ≈ 9.4pt = 19hp
        heading1: { run: { ...headingRunStyle, size: 56 } },  // 28pt (2em × 14pt)
        heading2: { run: { ...headingRunStyle, size: 42 } },  // 21pt (1.5em × 14pt)
        heading3: { run: { ...headingRunStyle, size: 33 } },  // ~16.4pt (1.17em × 14pt)
        heading4: { run: { ...headingRunStyle, size: 28 } },  // 14pt (1em × 14pt)
        heading5: { run: { ...headingRunStyle, size: 23 } },  // ~11.6pt (0.83em × 14pt)
        heading6: { run: { ...headingRunStyle, size: 19 } },  // ~9.4pt (0.67em × 14pt)
      },
    },
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
