import type { Editor } from '@tiptap/react'
import type { PageConfig } from '../components/PageSetup/PageSetupDialog'

const PAPER_SIZES: Record<string, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 216, height: 279 },
}

/**
 * Generate a self-contained HTML document for preview or PDF export.
 * The returned string includes full CSS and the editor's HTML content
 * wrapped in a .page div that matches the current pageConfig.
 */
export function generatePreviewHtml(editor: Editor, pageConfig: PageConfig): string {
  const contentHtml = editor.getHTML()
  const { width, height } = PAPER_SIZES[pageConfig.paperSize] ?? PAPER_SIZES.A4
  const isLandscape = pageConfig.orientation === 'landscape'
  const pageW = isLandscape ? height : width
  const pageH = isLandscape ? width : height
  // margins are stored in cm
  const mt = pageConfig.marginTop
  const mb = pageConfig.marginBottom
  const ml = pageConfig.marginLeft
  const mr = pageConfig.marginRight

  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>文档</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f0f0f0;
      display: flex;
      justify-content: center;
      padding: 40px 20px;
      font-family: '宋体', SimSun, serif;
    }
    @media print {
      body {
        background: white;
        padding: 0;
        display: block;
      }
      .page {
        box-shadow: none !important;
        margin: 0;
        width: 100%;
        min-height: 0;
      }
    }
    .page {
      background: white;
      width: ${pageW}mm;
      min-height: ${pageH}mm;
      padding: ${mt}cm ${mr}cm ${mb}cm ${ml}cm;
      box-shadow: 0 2px 20px rgba(0,0,0,0.15);
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
    }
    h1 { font-size: 18pt; font-weight: bold; margin: 0.5em 0; }
    h2 { font-size: 16pt; font-weight: bold; margin: 0.5em 0; }
    h3 { font-size: 14pt; font-weight: bold; margin: 0.4em 0; }
    h4, h5, h6 { font-weight: bold; margin: 0.3em 0; }
    p { margin: 0 0 0.5em 0; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    td, th { border: 1px solid #ccc; padding: 4px 8px; }
    img { max-width: 100%; height: auto; }
    ul, ol { margin: 0.5em 0; padding-left: 2em; }
    blockquote { border-left: 3px solid #ccc; margin: 0.5em 0; padding-left: 1em; color: #555; }
    pre { background: #f5f5f5; padding: 1em; border-radius: 4px; overflow-x: auto; }
    code { font-family: monospace; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="page">${contentHtml}</div>
</body>
</html>`
}
