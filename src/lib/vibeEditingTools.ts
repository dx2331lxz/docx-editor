/**
 * Vibe Editing — Tool definitions (OpenAI function-calling format)
 * and the tool executor that operates on a TipTap Editor instance.
 */
import type { Editor } from '@tiptap/react'
import type { PageConfig } from '../components/PageSetup/PageSetupDialog'
import html2canvas from 'html2canvas'

// ─── Module-level state ─────────────────────────────────────────────────────
let lastScreenshotBase64: string | null = null

// ─── OpenAI-compatible tool schemas ────────────────────────────────────────

export const VIBE_TOOLS = [
  // ── Read tools ──────────────────────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'get_document_text',
      description: '获取文档全文纯文本内容（无格式标签）',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_document_html',
      description: '获取文档完整 HTML 内容（含格式标签，p/h1/h2/strong/em 等）',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_document_structure',
      description: '获取文档大纲：所有标题文本、层级（h1/h2/h3）以及段落总数',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  // ── Core write tools ────────────────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'replace_document_html',
      description: '用新的 HTML 内容完全替换整篇文档，保留完整文档结构',
      parameters: {
        type: 'object',
        properties: {
          html: { type: 'string', description: '新的完整 HTML 内容，使用标准 HTML 标签如 <h1><h2><p><strong><em><ul><li> 等' },
        },
        required: ['html'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'replace_document_text',
      description: '将文档内指定文本片段替换为新文本（不改变格式）',
      parameters: {
        type: 'object',
        properties: {
          oldText: { type: 'string', description: '要被替换的原始文本' },
          newText: { type: 'string', description: '替换后的新文本' },
        },
        required: ['oldText', 'newText'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'apply_style_to_elements',
      description: '对文档 HTML 中指定标签类型批量修改内联样式（如统一行距、字号）',
      parameters: {
        type: 'object',
        properties: {
          tagName: { type: 'string', description: '要修改的 HTML 标签名，如 h1 / h2 / p / blockquote' },
          styles: { type: 'object', description: '要应用的 CSS 样式键值对，如 {"font-size":"16px","line-height":"2"}' },
        },
        required: ['tagName', 'styles'],
      },
    },
  },
  // ── Text format tools ───────────────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'set_font_size',
      description: '设置指定元素的字号，selector 可为 h1/h2/h3/p/.all（全部）',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS 选择器，如 h1 / h2 / p / .all' },
          size: { type: 'string', description: '字号，如 16px / 18pt / 1.2em' },
        },
        required: ['selector', 'size'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_font_family',
      description: '设置指定元素的字体',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS 选择器' },
          family: { type: 'string', description: '字体名，如 "宋体" / "微软雅黑" / "SimHei" / Arial' },
        },
        required: ['selector', 'family'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_text_color',
      description: '设置指定元素的文字颜色',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS 选择器' },
          color: { type: 'string', description: '颜色值，如 #333 / red / rgb(0,0,0)' },
        },
        required: ['selector', 'color'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_font_bold',
      description: '设置指定元素是否加粗',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS 选择器' },
          bold: { type: 'boolean', description: '是否加粗' },
        },
        required: ['selector', 'bold'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_line_height',
      description: '设置指定元素的行高',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS 选择器' },
          height: { type: 'string', description: '行高值，如 1.5 / 2 / 28px' },
        },
        required: ['selector', 'height'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_letter_spacing',
      description: '设置指定元素的字间距',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS 选择器' },
          spacing: { type: 'string', description: '字间距，如 0.05em / 1px / normal' },
        },
        required: ['selector', 'spacing'],
      },
    },
  },
  // ── Paragraph tools ─────────────────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'set_text_align',
      description: '设置指定元素的文字对齐方式',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS 选择器' },
          align: { type: 'string', enum: ['left', 'center', 'right', 'justify'], description: '对齐方式' },
        },
        required: ['selector', 'align'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_paragraph_spacing',
      description: '设置段前段后间距（作用于所有 p 和 h 元素）',
      parameters: {
        type: 'object',
        properties: {
          before: { type: 'string', description: '段前间距，如 0.5em / 8px' },
          after: { type: 'string', description: '段后间距，如 0.5em / 8px' },
        },
        required: ['before', 'after'],
      },
    },
  },
  // ── Paragraph layout tools ───────────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'set_indent',
      description: '设置段落缩进（首行缩进或块缩进）',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS 选择器，如 "p" ".all"' },
          level: { type: 'number', description: '缩进等级，1=2em首行缩进，2=4em，0=取消缩进' },
        },
        required: ['selector', 'level'],
      },
    },
  },
  // ── Document structure tools ─────────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'set_page_margins',
      description: '设置页面边距（通过修改编辑器容器的 padding 模拟）',
      parameters: {
        type: 'object',
        properties: {
          top: { type: 'string', description: '上边距，如 "20mm"' },
          bottom: { type: 'string', description: '下边距' },
          left: { type: 'string', description: '左边距' },
          right: { type: 'string', description: '右边距' },
        },
        required: ['top', 'bottom', 'left', 'right'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'normalize_headings',
      description: '自动规范化标题层级：确保 H1→H2→H3 正确嵌套，不跳级',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_table_of_contents',
      description: '在文档开头插入自动生成的目录（基于 H1/H2/H3 标题）',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_watermark',
      description: '添加文字水印到页面（半透明斜向显示）',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: '水印文字，如"机密"/"草稿"' },
          opacity: { type: 'number', description: '透明度 0-1，默认 0.15' },
        },
        required: ['text'],
      },
    },
  },
  // ── Theme tools ─────────────────────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'apply_document_theme',
      description: '一键应用文档主题，改变标题颜色/字体/行距等全局风格',
      parameters: {
        type: 'object',
        properties: {
          theme: {
            type: 'string',
            enum: ['default', 'business', 'academic', 'minimal', 'colorful'],
            description: 'default=黑白简洁 business=商务蓝 academic=学术灰 minimal=极简 colorful=彩色活力',
          },
        },
        required: ['theme'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_document_font',
      description: '统一整篇文档的字体',
      parameters: {
        type: 'object',
        properties: {
          font: { type: 'string', description: '字体名，如"微软雅黑"/"宋体"/"Georgia"/Arial' },
        },
        required: ['font'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'apply_heading_style',
      description: '为所有标题应用装饰样式',
      parameters: {
        type: 'object',
        properties: {
          style: {
            type: 'string',
            enum: ['underline', 'background', 'bordered', 'numbered', 'none'],
            description: 'underline=下划线 background=背景色 bordered=左边框 numbered=自动编号 none=清除样式',
          },
        },
        required: ['style'],
      },
    },
  },
  // ── Content cleanup tools ────────────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'remove_extra_spaces',
      description: '清除文档中多余的空格（连续空格、全角空格等）',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'remove_extra_blank_lines',
      description: '清除文档中多余的空行（连续两个以上空段落）',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_section_dividers',
      description: '在各大节（H2 之间）插入水平分隔线，增强视觉层次',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'convert_to_formal',
      description: '调用 AI 将文档内容改写为正式、专业的书面语风格',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'convert_to_casual',
      description: '调用 AI 将文档内容改写为轻松、口语化的表达风格',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'summarize_document',
      description: '调用 AI 生成文档摘要，插入到文档开头',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  // ── Table tools ──────────────────────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'format_all_tables',
      description: '批量美化文档中所有表格',
      parameters: {
        type: 'object',
        properties: {
          style: {
            type: 'string',
            enum: ['bordered', 'striped', 'minimal', 'colorful'],
            description: 'bordered=带边框 striped=斑马纹 minimal=无边框 colorful=彩色表头',
          },
        },
        required: ['style'],
      },
    },
  },
  // ── Advanced tools ───────────────────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'batch_replace',
      description: '批量替换文档中的多个文本片段',
      parameters: {
        type: 'object',
        properties: {
          rules: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                from: { type: 'string' },
                to: { type: 'string' },
              },
              required: ['from', 'to'],
            },
            description: '替换规则数组，每条包含 from（原文）和 to（替换为）',
          },
        },
        required: ['rules'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'highlight_keywords',
      description: '高亮文档中的关键词（背景色标注）',
      parameters: {
        type: 'object',
        properties: {
          keywords: { type: 'array', items: { type: 'string' }, description: '要高亮的关键词列表' },
          color: { type: 'string', description: '高亮背景色，如 #ffff00 / #ffd6d6' },
        },
        required: ['keywords', 'color'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'remove_formatting',
      description: '清除文档中所有内联格式（颜色、字号、粗体等），回归纯净正文',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  // ── Layout shortcuts (no-selector, whole-document) ──────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'set_document_line_height',
      description: '将全文所有段落的行间距统一设为指定倍数，无需指定选择器。常用值：1.0/1.5/2.0/2.5',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'string', description: '行距倍数，如 "1.5"、"2.0"。也可用 px/em 单位' },
        },
        required: ['value'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_document_paragraph_spacing',
      description: '将全文所有段落的段前/段后间距统一设为指定像素值',
      parameters: {
        type: 'object',
        properties: {
          before: { type: 'string', description: '段前间距，如 "6px"、"0px"' },
          after:  { type: 'string', description: '段后间距，如 "6px"、"12px"' },
        },
        required: ['before', 'after'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_first_line_indent',
      description: '将全文所有正文段落设为首行缩进2字符（2em），中文排版标准格式',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_body_font_size',
      description: '将全文正文（段落、列表、表格，不含标题）统一设为指定字号',
      parameters: {
        type: 'object',
        properties: {
          size: { type: 'string', description: '字号，如 "12pt"、"14px"、"16px"' },
        },
        required: ['size'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_body_font_family',
      description: '将全文正文（段落、列表、表格，不含标题）统一设为指定字体',
      parameters: {
        type: 'object',
        properties: {
          font: { type: 'string', description: '字体名称，如 "宋体"、"黑体"、"微软雅黑"、"仿宋"、"楷体"' },
        },
        required: ['font'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'remove_blank_lines',
      description: '清除文档中连续多余的空行，每处最多保留1个空行',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'clear_inline_styles',
      description: '清除全文所有内联样式，保留标题层级和基础结构（段落/列表/表格），适合重新排版',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'smart_layout',
      description: '一键智能排版：统一字体宋体、正文12pt、行距1.5、首行缩进2em、标题加粗，快速达到规范格式',
      parameters: {
        type: 'object',
        properties: {
          font:      { type: 'string', description: '正文字体，默认 "宋体"' },
          bodySize:  { type: 'string', description: '正文字号，默认 "12pt"' },
          lineHeight:{ type: 'string', description: '行距倍数，默认 "1.5"' },
          indent:    { type: 'boolean', description: '是否首行缩进2em，默认 true' },
        },
        required: [],
      },
    },
  },
  // ── Style query tools ─────────────────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'get_document_styles',
      description: '获取文档当前排版样式，包括正文字号/字体/行高、各级标题样式、页边距等',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_selection_styles',
      description: '获取当前选中文本或光标所在位置的样式（字号、字体、颜色、加粗等）',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  // ── Screenshot & multimodal analysis tools ───────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'screenshot_document',
      description: '对当前文档页面截图，返回 base64 图片，供多模态模型分析整体排版和审美',
      parameters: {
        type: 'object',
        properties: {
          area: {
            type: 'string',
            enum: ['full', 'top', 'first_screen'],
            description: '截图范围：full=完整文档，top=文档顶部（前1000px），first_screen=首屏',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'analyze_document_aesthetics',
      description: '调用多模态AI分析文档截图，评估排版美观度并给出改进建议。需先调用 screenshot_document',
      parameters: {
        type: 'object',
        properties: {
          focus: {
            type: 'string',
            enum: ['overall', 'typography', 'spacing', 'hierarchy'],
            description: '分析重点：overall（整体）、typography（字体排版）、spacing（间距）、hierarchy（层级结构）',
          },
        },
        required: [],
      },
    },
  },
  // ── Finish ────────────────────────────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'finish',
      description: '所有编辑操作已完成，向用户报告本次编辑结果',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: '本次 Vibe Editing 的简要说明（1-3句话）' },
        },
        required: ['summary'],
      },
    },
  },
]

// ─── Tool executor ──────────────────────────────────────────────────────────

// Helper: apply inline styles to all matching elements in HTML string
function applyStylesToHTML(
  html: string,
  selector: string,
  styles: Record<string, string>,
): { newHtml: string; count: number } {
  const parser = new DOMParser()
  const docNode = parser.parseFromString(html, 'text/html')
  // Expand .all to all block elements
  const realSelector = selector === '.all' ? 'h1,h2,h3,h4,h5,h6,p,li,blockquote,td,th' : selector
  const els = docNode.querySelectorAll(realSelector)
  const styleStr = Object.entries(styles).map(([k, v]) => `${k}:${v}`).join(';')
  els.forEach(el => {
    const existing = el.getAttribute('style') || ''
    el.setAttribute('style', existing ? `${existing};${styleStr}` : styleStr)
  })
  return { newHtml: docNode.body.innerHTML, count: els.length }
}

/**
 * Apply font-size to matching elements in a way TipTap can read.
 * TipTap's FontSize extension stores size on <span style="font-size:..."> (textStyle mark),
 * NOT on block-level tags. So we must set font-size on all child spans (or wrap text nodes).
 */
function applyFontSizeToHTML(
  html: string,
  selector: string,
  size: string,
): { newHtml: string; count: number } {
  return applySpanStyleToHTML(html, selector, 'font-size', size)
}

/**
 * Apply a CSS property to span-level elements inside matching block elements.
 * TipTap stores text styles (font-size, font-family, color, etc.) on <span> via textStyle mark.
 * Writing to block-level tags is invisible to TipTap's mark system.
 */
function applySpanStyleToHTML(
  html: string,
  selector: string,
  prop: string,
  value: string,
): { newHtml: string; count: number } {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const realSelector = selector === '.all' ? 'h1,h2,h3,h4,h5,h6,p,li,blockquote,td,th' : selector
  const els = doc.querySelectorAll(realSelector)
  let count = 0
  els.forEach(el => {
    count++
    // Update all existing spans inside
    el.querySelectorAll('span').forEach(span => {
      const s = span.getAttribute('style') || ''
      const cleaned = s.replace(new RegExp(`(?:^|;)\\s*${prop.replace('-', '\\-')}\\s*:[^;]*`, 'g'), '').replace(/^;/, '').trim()
      span.setAttribute('style', cleaned ? `${cleaned};${prop}:${value}` : `${prop}:${value}`)
    })
    // Wrap bare text nodes in a span
    Array.from(el.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        const span = doc.createElement('span')
        span.setAttribute('style', `${prop}:${value}`)
        el.insertBefore(span, node)
        span.appendChild(node)
      }
    })
  })
  return { newHtml: doc.body.innerHTML, count }
}

// Themes map
const THEMES_MAP: Record<string, { h1: string; h2: string; h3: string; p: string; font?: string }> = {
  default: { h1: 'color:#1a1a1a;font-size:22px;font-weight:700', h2: 'color:#333;font-size:18px;font-weight:600', h3: 'color:#555;font-size:15px;font-weight:600', p: 'color:#333;line-height:1.8' },
  business: { h1: 'color:#1e3a5f;font-size:22px;font-weight:700', h2: 'color:#2563a8;font-size:18px;font-weight:600', h3: 'color:#3b82c4;font-size:15px;font-weight:600', p: 'color:#374151;line-height:1.8', font: '微软雅黑' },
  academic: { h1: 'color:#2c2c2c;font-size:20px;font-weight:700;text-align:center', h2: 'color:#444;font-size:16px;font-weight:700', h3: 'color:#555;font-size:14px;font-weight:600', p: 'color:#333;line-height:2;text-indent:2em', font: '宋体' },
  minimal: { h1: 'color:#111;font-size:24px;font-weight:300;letter-spacing:2px', h2: 'color:#333;font-size:18px;font-weight:300', h3: 'color:#666;font-size:14px;font-weight:400;text-transform:uppercase', p: 'color:#444;line-height:1.9' },
  colorful: { h1: 'color:#7c3aed;font-size:22px;font-weight:700', h2: 'color:#2563eb;font-size:18px;font-weight:600', h3: 'color:#059669;font-size:15px;font-weight:600', p: 'color:#374151;line-height:1.8' },
}

// SiliconFlow API helper for content rewriting
import { API } from './apiRoutes'
const SF_API_ENDPOINT = API.aiChat
const SF_API_KEY = ''
const SF_MODEL = 'Pro/moonshotai/Kimi-K2.5'

async function callSiliconFlow(systemPrompt: string, userContent: string): Promise<string> {
  const resp = await fetch(SF_API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SF_API_KEY}` },
    body: JSON.stringify({
      model: SF_MODEL,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
      max_tokens: 4096,
      temperature: 0.5,
    }),
  })
  if (!resp.ok) throw new Error(`API error ${resp.status}`)
  const data = await resp.json()
  return data.choices?.[0]?.message?.content || ''
}

export async function executeTool(
  toolName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any>,
  editor: Editor,
  onPageConfigChange?: (updater: (prev: PageConfig) => PageConfig) => void,
  pageConfig?: PageConfig,
): Promise<string> {
  try {
    switch (toolName) {
      case 'get_document_text': {
        const text = editor.getText()
        if (!text.trim()) return '（文档为空）'
        return text.slice(0, 8000)
      }

      case 'get_document_html': {
        return editor.getHTML().slice(0, 12000)
      }

      case 'get_document_structure': {
        const html = editor.getHTML()
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        const headings = Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6'))
          .map(el => `${el.tagName.toLowerCase()}: ${el.textContent?.trim()}`)
        const paraCount = doc.querySelectorAll('p').length
        return JSON.stringify({ headings, paragraphCount: paraCount }, null, 2)
      }

      case 'replace_document_html': {
        const { html } = args as { html: string }
        if (!html) return '错误：html 参数为空'
        editor.chain().focus().setContent(html, true).run()
        return '文档已替换，字符数：' + html.length
      }

      case 'replace_document_text': {
        const { oldText, newText } = args as { oldText: string; newText: string }
        const currentHtml = editor.getHTML()
        if (!currentHtml.includes(oldText)) return `未找到文本："${oldText.slice(0, 50)}"，请检查原文`
        const newHtml = currentHtml.split(oldText).join(newText)
        editor.chain().focus().setContent(newHtml, true).run()
        return `已将 "${oldText.slice(0, 40)}" 替换为 "${newText.slice(0, 40)}"`
      }

      case 'apply_style_to_elements': {
        const { tagName, styles } = args as { tagName: string; styles: Record<string, string> }
        const { newHtml, count } = applyStylesToHTML(editor.getHTML(), tagName, styles)
        if (count === 0) return `文档中未找到 <${tagName}> 元素`
        editor.chain().focus().setContent(newHtml, true).run()
        return `已对 ${count} 个 <${tagName}> 元素应用样式`
      }

      // ── Text format tools ────────────────────────────────────────────
      case 'set_font_size': {
        const { selector, size } = args as { selector: string; size: string }
        const { newHtml, count } = applyFontSizeToHTML(editor.getHTML(), selector, size)
        editor.chain().focus().setContent(newHtml, true).run()
        return `已设置 ${count} 个元素字号为 ${size}`
      }

      case 'set_font_family': {
        const { selector, family } = args as { selector: string; family: string }
        const { newHtml, count } = applySpanStyleToHTML(editor.getHTML(), selector, 'font-family', family)
        editor.chain().focus().setContent(newHtml, true).run()
        return `已设置 ${count} 个元素字体为 ${family}`
      }

      case 'set_text_color': {
        const { selector, color } = args as { selector: string; color: string }
        const { newHtml, count } = applySpanStyleToHTML(editor.getHTML(), selector, 'color', color)
        editor.chain().focus().setContent(newHtml, true).run()
        return `已设置 ${count} 个元素文字颜色为 ${color}`
      }

      case 'set_font_bold': {
        const { selector, bold } = args as { selector: string; bold: boolean }
        const { newHtml, count } = applySpanStyleToHTML(editor.getHTML(), selector, 'font-weight', bold ? '700' : '400')
        editor.chain().focus().setContent(newHtml, true).run()
        return `已设置 ${count} 个元素${bold ? '加粗' : '取消加粗'}`
      }

      case 'set_line_height': {
        const { selector, height } = args as { selector: string; height: string }
        const { newHtml, count } = applyStylesToHTML(editor.getHTML(), selector, { 'line-height': height })
        editor.chain().focus().setContent(newHtml, true).run()
        return `已设置 ${count} 个元素行高为 ${height}`
      }

      case 'set_letter_spacing': {
        const { selector, spacing } = args as { selector: string; spacing: string }
        const { newHtml, count } = applySpanStyleToHTML(editor.getHTML(), selector, 'letter-spacing', spacing)
        editor.chain().focus().setContent(newHtml, true).run()
        return `已设置 ${count} 个元素字间距为 ${spacing}`
      }

      case 'set_text_align': {
        const { selector, align } = args as { selector: string; align: string }
        const { newHtml, count } = applyStylesToHTML(editor.getHTML(), selector, { 'text-align': align })
        editor.chain().focus().setContent(newHtml, true).run()
        return `已设置 ${count} 个元素文字对齐为 ${align}`
      }

      case 'set_indent': {
        const { selector, level } = args as { selector: string; level: number }
        const indentValue = level === 0 ? '0' : `${level * 2}em`
        const styles: Record<string, string> = level === 0 ? { 'text-indent': '0', 'padding-left': '0' } : { 'text-indent': indentValue }
        const { newHtml, count } = applyStylesToHTML(editor.getHTML(), selector, styles)
        editor.chain().focus().setContent(newHtml, true).run()
        return `已设置 ${count} 个元素缩进为 ${indentValue}`
      }

      case 'set_paragraph_spacing': {
        const { before, after } = args as { before: string; after: string }
        const html = editor.getHTML()
        const r1 = applyStylesToHTML(html, 'p,h1,h2,h3,h4,h5,h6', { 'margin-top': before, 'margin-bottom': after })
        editor.chain().focus().setContent(r1.newHtml, true).run()
        return `已设置段前 ${before}，段后 ${after}`
      }

      // ── Document structure ───────────────────────────────────────────
      case 'normalize_headings': {
        const html = editor.getHTML()
        const parser = new DOMParser()
        const docNode = parser.parseFromString(html, 'text/html')
        // Ensure proper H1→H2→H3 nesting: no skipping levels
        let lastLevel = 0
        let changed = 0
        docNode.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(el => {
          const level = parseInt(el.tagName[1])
          if (lastLevel > 0 && level > lastLevel + 1) {
            const newTag = `h${lastLevel + 1}`
            const newEl = docNode.createElement(newTag)
            newEl.innerHTML = el.innerHTML
            el.replaceWith(newEl)
            changed++
            lastLevel = lastLevel + 1
          } else {
            lastLevel = level
          }
        })
        if (changed > 0) editor.chain().focus().setContent(docNode.body.innerHTML, true).run()
        return `标题层级规范化完成，修正了 ${changed} 处跳级`
      }

      case 'add_table_of_contents': {
        const html = editor.getHTML()
        const parser = new DOMParser()
        const docNode = parser.parseFromString(html, 'text/html')
        const headings = Array.from(docNode.querySelectorAll('h1,h2,h3'))
        if (headings.length === 0) return '文档中没有标题，无法生成目录'
        let tocHtml = '<div style="border:1px solid #e5e7eb;border-radius:4px;padding:16px;margin-bottom:24px;background:#f9fafb"><h2 style="margin:0 0 12px;font-size:16px;color:#111">目录</h2>'
        headings.forEach((h, i) => {
          const level = parseInt(h.tagName[1])
          const indent = (level - 1) * 16
          tocHtml += `<div style="padding-left:${indent}px;margin:4px 0;font-size:${level === 1 ? 14 : 13}px;color:#374151">${level === 1 ? '◆' : level === 2 ? '◇' : '·'} ${h.textContent?.trim()} <span style="color:#9ca3af;float:right">···</span></div>`
          h.id = `heading-${i}`
        })
        tocHtml += '</div>'
        editor.chain().focus().setContent(tocHtml + html, true).run()
        return `已在文档开头插入包含 ${headings.length} 个条目的目录`
      }

      case 'add_watermark': {
        // Watermark is handled via CSS in the page background, just report
        const { text, opacity = 0.15 } = args as { text: string; opacity?: number }
        // Dispatch custom event to App to set watermark
        window.dispatchEvent(new CustomEvent('vibe:set-watermark', { detail: { text, opacity } }))
        return `已添加水印文字"${text}"，透明度 ${opacity}`
      }

      // ── Theme ────────────────────────────────────────────────────────
      case 'apply_document_theme': {
        const { theme } = args as { theme: string }
        const t = THEMES_MAP[theme] || THEMES_MAP.default
        let html = editor.getHTML()
        // Span-level props must go to spans; block-level props go to block tags
        const SPAN_PROPS = new Set(['font-size', 'font-family', 'color', 'font-weight', 'letter-spacing'])
        const applyThemeStyles = (tag: string, s: string) => {
          const pairs = s.split(';').map(x => x.split(':').map(s => s.trim()) as [string, string]).filter(([k]) => k)
          const blockStyles: Record<string, string> = {}
          pairs.forEach(([k, v]) => {
            if (SPAN_PROPS.has(k)) {
              html = applySpanStyleToHTML(html, tag, k, v).newHtml
            } else {
              blockStyles[k] = v
            }
          })
          if (Object.keys(blockStyles).length > 0) {
            html = applyStylesToHTML(html, tag, blockStyles).newHtml
          }
        }
        applyThemeStyles('h1', t.h1); applyThemeStyles('h2', t.h2); applyThemeStyles('h3', t.h3); applyThemeStyles('p', t.p)
        if (t.font) {
          html = applySpanStyleToHTML(html, 'h1,h2,h3,h4,p,li', 'font-family', t.font).newHtml
        }
        editor.chain().focus().setContent(html, true).run()
        return `已应用"${theme}"主题`
      }

      case 'set_document_font': {
        const { font } = args as { font: string }
        const { newHtml, count } = applySpanStyleToHTML(editor.getHTML(), 'h1,h2,h3,h4,h5,h6,p,li,td,th', 'font-family', font)
        editor.chain().focus().setContent(newHtml, true).run()
        return `已将 ${count} 个元素字体统一为"${font}"`
      }

      case 'set_page_margins': {
        const { top, bottom, left, right } = args as { top: string; bottom: string; left: string; right: string }

        /** Parse a CSS length value to centimetres */
        const parseCm = (val: string): number => {
          const n = parseFloat(val)
          if (val.endsWith('mm')) return n / 10
          if (val.endsWith('in')) return n * 2.54
          return isNaN(n) ? 2.54 : n  // default: treat bare number as cm
        }

        if (onPageConfigChange) {
          onPageConfigChange(prev => ({
            ...prev,
            marginTop:    parseCm(top),
            marginBottom: parseCm(bottom),
            marginLeft:   parseCm(left),
            marginRight:  parseCm(right),
          }))
        }
        return `已设置页边距：上${top} 下${bottom} 左${left} 右${right}`
      }

      case 'apply_heading_style': {
        const { style } = args as { style: string }
        const html = editor.getHTML()
        const parser = new DOMParser()
        const docNode = parser.parseFromString(html, 'text/html')
        let counter = { h1: 0, h2: 0, h3: 0 }
        docNode.querySelectorAll('h1,h2,h3').forEach(el => {
          const tag = el.tagName.toLowerCase() as 'h1' | 'h2' | 'h3'
          counter[tag]++
          const existing = el.getAttribute('style') || ''
          if (style === 'underline') {
            el.setAttribute('style', `${existing};border-bottom:2px solid currentColor;padding-bottom:4px`)
          } else if (style === 'background') {
            const colors: Record<string, string> = { h1: '#e8f0fe', h2: '#f3e8ff', h3: '#f0fdf4' }
            el.setAttribute('style', `${existing};background:${colors[tag]};padding:4px 8px;border-radius:4px`)
          } else if (style === 'bordered') {
            el.setAttribute('style', `${existing};border-left:4px solid #2563eb;padding-left:12px`)
          } else if (style === 'numbered') {
            el.textContent = `${counter[tag]}. ${el.textContent}`
          } else if (style === 'none') {
            el.removeAttribute('style')
          }
        })
        editor.chain().focus().setContent(docNode.body.innerHTML, true).run()
        return `已对所有标题应用"${style}"样式`
      }


      case 'convert_to_formal': {
        const docText = editor.getText()
        if (!docText.trim()) return '文档为空，无法改写'
        const rewritten = await callSiliconFlow(
          '你是专业文字编辑。将用户提供的文本改写为正式、专业的书面语风格：使用规范词汇，句式完整，措辞严谨，避免口语化表达。保留原文的HTML标签结构，只改写文字内容。',
          editor.getHTML().slice(0, 6000),
        )
        if (!rewritten) return 'AI 改写失败，请重试'
        editor.chain().focus().setContent(rewritten, true).run()
        return '已将文档内容改写为正式书面语风格'
      }

      case 'convert_to_casual': {
        const docText2 = editor.getText()
        if (!docText2.trim()) return '文档为空，无法改写'
        const rewritten2 = await callSiliconFlow(
          '你是专业文字编辑。将用户提供的文本改写为轻松、口语化的表达风格：用词自然，句子简短，贴近日常交流，去除过于书面化的措辞。保留原文的HTML标签结构，只改写文字内容。',
          editor.getHTML().slice(0, 6000),
        )
        if (!rewritten2) return 'AI 改写失败，请重试'
        editor.chain().focus().setContent(rewritten2, true).run()
        return '已将文档内容改写为轻松口语化风格'
      }

      case 'summarize_document': {
        const docText3 = editor.getText()
        if (!docText3.trim()) return '文档为空，无法生成摘要'
        const summary = await callSiliconFlow(
          '你是专业编辑。根据用户提供的文档内容，生成一段简洁的摘要（200字以内），以HTML格式返回，用 <p> 标签包裹，前面加 <h2>摘要</h2>。只返回摘要HTML，不要其他内容。',
          docText3.slice(0, 4000),
        )
        if (!summary) return 'AI 生成摘要失败，请重试'
        const current = editor.getHTML()
        editor.chain().focus().setContent(summary + current, true).run()
        return '已在文档开头插入 AI 生成摘要'
      }

      case 'remove_extra_spaces': {
        let html = editor.getHTML()
        html = html.replace(/[ \u3000\u00a0]{2,}/g, ' ') // collapse multi-spaces
        editor.chain().focus().setContent(html, true).run()
        return '已清除多余空格'
      }

      case 'remove_extra_blank_lines': {
        const html = editor.getHTML()
        // Remove sequences of empty <p></p> or <p><br></p>
        const cleaned = html.replace(/(<p[^>]*>(<br>|&nbsp;|\s)*<\/p>){2,}/gi, '<p><br></p>')
        editor.chain().focus().setContent(cleaned, true).run()
        return '已清除多余空行'
      }

      case 'add_section_dividers': {
        const html = editor.getHTML()
        // Insert <hr> before every h2 that's not the first element
        const withDividers = html.replace(/(<h2[^>]*>(?!<\/h2>))/gi, '<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">$1')
        editor.chain().focus().setContent(withDividers, true).run()
        return '已在各节之间插入分隔线'
      }

      // ── Tables ───────────────────────────────────────────────────────
      case 'format_all_tables': {
        const { style } = args as { style: string }
        const html = editor.getHTML()
        const parser = new DOMParser()
        const docNode = parser.parseFromString(html, 'text/html')
        const tables = docNode.querySelectorAll('table')
        if (tables.length === 0) return '文档中没有表格'

        const styleMap: Record<string, string> = {
          bordered: 'border-collapse:collapse;width:100%',
          striped: 'border-collapse:collapse;width:100%',
          minimal: 'border-collapse:collapse;width:100%;border:none',
          colorful: 'border-collapse:collapse;width:100%',
        }
        tables.forEach(table => {
          table.setAttribute('style', styleMap[style] || styleMap.bordered)
          table.querySelectorAll('td,th').forEach((cell, i) => {
            if (style === 'bordered') cell.setAttribute('style', 'border:1px solid #d1d5db;padding:6px 10px')
            else if (style === 'striped') cell.setAttribute('style', `border:1px solid #e5e7eb;padding:6px 10px;${i % 2 === 0 ? 'background:#f9fafb' : ''}`)
            else if (style === 'minimal') cell.setAttribute('style', 'border-bottom:1px solid #e5e7eb;padding:6px 10px')
            else if (style === 'colorful') cell.setAttribute('style', `border:1px solid #bfdbfe;padding:6px 10px;${cell.tagName === 'TH' ? 'background:#1d4ed8;color:white;font-weight:600' : ''}`)
          })
        })
        editor.chain().focus().setContent(docNode.body.innerHTML, true).run()
        return `已对 ${tables.length} 个表格应用"${style}"样式`
      }

      // ── Advanced ─────────────────────────────────────────────────────
      case 'batch_replace': {
        const { rules } = args as { rules: Array<{ from: string; to: string }> }
        let html = editor.getHTML()
        let replaced = 0
        for (const rule of rules) {
          if (html.includes(rule.from)) {
            html = html.split(rule.from).join(rule.to)
            replaced++
          }
        }
        editor.chain().focus().setContent(html, true).run()
        return `批量替换完成，执行了 ${replaced}/${rules.length} 条规则`
      }

      case 'highlight_keywords': {
        const { keywords, color } = args as { keywords: string[]; color: string }
        let html = editor.getHTML()
        for (const kw of keywords) {
          const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          html = html.replace(new RegExp(escaped, 'gi'), `<mark style="background:${color || '#ffff00'};border-radius:2px">$&</mark>`)
        }
        editor.chain().focus().setContent(html, true).run()
        return `已高亮 ${keywords.length} 个关键词`
      }

      case 'remove_formatting': {
        const html = editor.getHTML()
        const parser = new DOMParser()
        const docNode = parser.parseFromString(html, 'text/html')
        docNode.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'))
        docNode.querySelectorAll('font,span').forEach(el => {
          const parent = el.parentNode
          while (el.firstChild) parent?.insertBefore(el.firstChild, el)
          parent?.removeChild(el)
        })
        editor.chain().focus().setContent(docNode.body.innerHTML, true).run()
        return '已清除所有内联格式'
      }

      case 'convert_to_formal': {
        const text = editor.getText()
        if (!text.trim()) return '文档为空，无法改写'
        const result = await callSiliconFlow(
          '你是专业的文档改写助手。请将用户提供的文本改写为正式、规范的书面语风格，保持原意不变。直接输出改写后的HTML内容，使用p/h1/h2/h3/ul/li等标签。',
          `请将以下文本改写为正式公文风格：\n\n${text.slice(0, 3000)}`
        )
        if (result) {
          const cleaned = result.replace(/```html\n?/gi, '').replace(/```\n?/gi, '').trim()
          editor.chain().focus().setContent(cleaned.startsWith('<') ? cleaned : `<p>${cleaned.replace(/\n/g, '</p><p>')}</p>`, true).run()
          return '已将文档内容改写为正式书面语风格'
        }
        return '改写失败，API 未返回内容'
      }

      case 'convert_to_casual': {
        const text = editor.getText()
        if (!text.trim()) return '文档为空，无法改写'
        const result = await callSiliconFlow(
          '你是专业的文档改写助手。请将用户提供的文本改写为轻松、口语化的表达风格，保持原意不变。直接输出改写后的内容，使用p/ul/li等HTML标签。',
          `请将以下文本改写为口语化轻松风格：\n\n${text.slice(0, 3000)}`
        )
        if (result) {
          const cleaned = result.replace(/```html\n?/gi, '').replace(/```\n?/gi, '').trim()
          editor.chain().focus().setContent(cleaned.startsWith('<') ? cleaned : `<p>${cleaned.replace(/\n/g, '</p><p>')}</p>`, true).run()
          return '已将文档内容改写为口语化风格'
        }
        return '改写失败，API 未返回内容'
      }

      case 'summarize_document': {
        const text = editor.getText()
        if (!text.trim()) return '文档为空，无法生成摘要'
        const summary = await callSiliconFlow(
          '你是文档摘要专家。请为用户提供的文档生成简洁的摘要（150-300字），涵盖主要内容和核心观点。直接输出摘要文本，不加任何前缀。',
          text.slice(0, 4000)
        )
        if (summary) {
          const currentHtml = editor.getHTML()
          const summaryBlock = `<div style="background:#f0f9ff;border-left:4px solid #0ea5e9;padding:12px 16px;margin-bottom:24px;border-radius:0 8px 8px 0"><h3 style="color:#0369a1;margin:0 0 8px;font-size:14px">📋 文档摘要</h3><p style="color:#374151;line-height:1.8;margin:0">${summary.trim()}</p></div>`
          editor.chain().focus().setContent(summaryBlock + currentHtml, true).run()
          return '已在文档开头插入 AI 生成的摘要'
        }
        return '摘要生成失败，API 未返回内容'
      }

      // ── Layout shortcuts ─────────────────────────────────────────────
      case 'set_document_line_height': {
        const { value } = args as { value: string }
        const { newHtml, count } = applyStylesToHTML(
          editor.getHTML(),
          'p,h1,h2,h3,h4,h5,h6,li,blockquote',
          { 'line-height': value }
        )
        editor.chain().focus().setContent(newHtml, true).run()
        return `已将 ${count} 个段落行间距设为 ${value}`
      }

      case 'set_document_paragraph_spacing': {
        const { before, after } = args as { before: string; after: string }
        const { newHtml, count } = applyStylesToHTML(
          editor.getHTML(),
          'p,h1,h2,h3,h4,h5,h6',
          { 'margin-top': before, 'margin-bottom': after }
        )
        editor.chain().focus().setContent(newHtml, true).run()
        return `已将 ${count} 个段落段前设为 ${before}，段后设为 ${after}`
      }

      case 'set_first_line_indent': {
        const { newHtml, count } = applyStylesToHTML(
          editor.getHTML(),
          'p',
          { 'text-indent': '2em' }
        )
        editor.chain().focus().setContent(newHtml, true).run()
        return `已将 ${count} 个段落设为首行缩进 2em`
      }

      case 'set_body_font_size': {
        const { size } = args as { size: string }
        const { newHtml, count } = applySpanStyleToHTML(
          editor.getHTML(),
          'p,li,td,th',
          'font-size', size
        )
        editor.chain().focus().setContent(newHtml, true).run()
        return `已将 ${count} 个正文元素字号设为 ${size}`
      }

      case 'set_body_font_family': {
        const { font } = args as { font: string }
        const { newHtml, count } = applySpanStyleToHTML(
          editor.getHTML(),
          'p,li,td,th',
          'font-family', font
        )
        editor.chain().focus().setContent(newHtml, true).run()
        return `已将 ${count} 个正文元素字体设为 ${font}`
      }

      case 'remove_blank_lines': {
        const html = editor.getHTML()
        const cleaned = html.replace(/(<p[^>]*>(<br\s*\/?>|&nbsp;|\u00a0|\s)*<\/p>\s*){2,}/gi, '<p><br></p>')
        editor.chain().focus().setContent(cleaned, true).run()
        return '已清除多余空行'
      }

      case 'clear_inline_styles': {
        const html = editor.getHTML()
        const parser = new DOMParser()
        const docNode = parser.parseFromString(html, 'text/html')
        // Remove inline styles but keep heading/paragraph/list structure
        docNode.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'))
        // Unwrap <span> and <font> but keep semantic tags
        docNode.querySelectorAll('span,font').forEach(el => {
          const parent = el.parentNode
          if (!parent) return
          while (el.firstChild) parent.insertBefore(el.firstChild, el)
          parent.removeChild(el)
        })
        editor.chain().focus().setContent(docNode.body.innerHTML, true).run()
        return '已清除所有内联格式，保留标题层级和段落结构'
      }

      case 'smart_layout': {
        const {
          font = '宋体',
          bodySize = '12pt',
          lineHeight = '1.5',
          indent = true,
        } = args as { font?: string; bodySize?: string; lineHeight?: string; indent?: boolean }

        let html = editor.getHTML()
        // Step 1: unified body font (span-level)
        html = applySpanStyleToHTML(html, 'p,li,td,th', 'font-family', font).newHtml
        // Step 2: unified body font size (span-level)
        html = applySpanStyleToHTML(html, 'p,li,td,th', 'font-size', bodySize).newHtml
        // Step 3: line height for all blocks (block-level — correct)
        html = applyStylesToHTML(html, 'p,h1,h2,h3,h4,h5,h6,li', { 'line-height': lineHeight }).newHtml
        // Step 4: first-line indent for paragraphs
        if (indent) {
          html = applyStylesToHTML(html, 'p', { 'text-indent': '2em' }).newHtml
        }
        // Step 5: ensure headings are bold (span-level)
        html = applySpanStyleToHTML(html, 'h1,h2,h3,h4', 'font-weight', '700').newHtml

        editor.chain().focus().setContent(html, true).run()
        return `智能排版完成：字体 ${font}、正文 ${bodySize}、行距 ${lineHeight}、${indent ? '首行缩进2em、' : ''}标题加粗`
      }

      case 'get_document_styles': {
        const html = editor.getHTML()
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')

        // Extract body (p) styles from first paragraph
        const firstP = doc.querySelector('p')
        const pStyle = firstP?.getAttribute('style') || ''
        const getStyleProp = (style: string, prop: string) => {
          const m = style.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`))
          return m ? m[1].trim() : null
        }
        const bodyStyles = {
          'font-size': getStyleProp(pStyle, 'font-size') ?? '14pt (default)',
          'font-family': getStyleProp(pStyle, 'font-family') ?? '宋体 (default)',
          'line-height': getStyleProp(pStyle, 'line-height') ?? '1.6 (default)',
          'color': getStyleProp(pStyle, 'color') ?? '#000000 (default)',
          'text-indent': getStyleProp(pStyle, 'text-indent') ?? 'none',
        }

        // Extract heading styles
        const headingStyles: Record<string, Record<string, string>> = {}
        for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
          const el = doc.querySelector(tag)
          if (el) {
            const s = el.getAttribute('style') || ''
            headingStyles[tag] = {
              'font-size': getStyleProp(s, 'font-size') ?? 'default',
              'font-weight': getStyleProp(s, 'font-weight') ?? 'bold',
              'color': getStyleProp(s, 'color') ?? 'default',
              'text-align': getStyleProp(s, 'text-align') ?? 'left',
            }
          }
        }

        // Page config
        const page = pageConfig ? {
          paperSize: pageConfig.paperSize,
          orientation: pageConfig.orientation,
          marginTop: `${pageConfig.marginTop}cm`,
          marginBottom: `${pageConfig.marginBottom}cm`,
          marginLeft: `${pageConfig.marginLeft}cm`,
          marginRight: `${pageConfig.marginRight}cm`,
        } : { note: 'pageConfig not available' }

        return JSON.stringify({ body: bodyStyles, headings: headingStyles, page }, null, 2)
      }

      case 'get_selection_styles': {
        const attrs = editor.getAttributes('textStyle')
        const styles: Record<string, unknown> = {
          fontSize: attrs.fontSize ?? null,
          fontFamily: attrs.fontFamily ?? null,
          color: attrs.color ?? null,
          bold: editor.isActive('bold'),
          italic: editor.isActive('italic'),
          underline: editor.isActive('underline'),
          strike: editor.isActive('strike'),
          textAlign: editor.isActive({ textAlign: 'left' }) ? 'left'
            : editor.isActive({ textAlign: 'center' }) ? 'center'
            : editor.isActive({ textAlign: 'right' }) ? 'right'
            : editor.isActive({ textAlign: 'justify' }) ? 'justify'
            : 'left',
          heading: editor.isActive('heading', { level: 1 }) ? 'h1'
            : editor.isActive('heading', { level: 2 }) ? 'h2'
            : editor.isActive('heading', { level: 3 }) ? 'h3'
            : editor.isActive('heading', { level: 4 }) ? 'h4'
            : 'paragraph',
        }
        return JSON.stringify(styles, null, 2)
      }

      case 'screenshot_document': {
        const { area = 'first_screen' } = args as { area?: string }
        const pageEl = document.querySelector('.a4-page') as HTMLElement
        if (!pageEl) return '错误：未找到文档页面元素（.a4-page）'

        const canvas = await html2canvas(pageEl, {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          height: area === 'first_screen' ? 900 : area === 'top' ? 1000 : undefined,
          windowHeight: area === 'first_screen' ? 900 : area === 'top' ? 1000 : undefined,
        })

        const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
        lastScreenshotBase64 = base64
        return `截图成功，尺寸：${canvas.width}×${canvas.height}px，base64已缓存供多模态分析使用`
      }

      case 'analyze_document_aesthetics': {
        if (!lastScreenshotBase64) return '错误：请先调用 screenshot_document 获取截图'

        const { focus = 'overall' } = args as { focus?: string }

        const focusPrompts: Record<string, string> = {
          overall: '请分析这份文档的整体排版和视觉效果。从以下角度评估：1）标题层级视觉差异是否清晰；2）正文行距和字号是否舒适；3）页面空白和密度是否合理；4）整体视觉风格（商务/学术/现代等）；5）最需要改进的2-3个排版问题，并给出具体建议（如"h1字号偏小，建议调大到X pt"）。请用中文简洁回答。',
          typography: '请重点分析这份文档的字体排版，包括字号大小、字体选择、字重对比等，给出具体改进建议。请用中文简洁回答。',
          spacing: '请重点分析这份文档的间距设置，包括行间距、段落间距、标题前后间距、页边距等，给出具体改进建议。请用中文简洁回答。',
          hierarchy: '请重点分析这份文档的层级结构视觉效果，标题h1/h2/h3之间的视觉差异是否足够清晰，层级关系是否一目了然，给出具体改进建议。请用中文简洁回答。',
        }

        const visionPrompt = focusPrompts[focus] ?? focusPrompts.overall

        const response = await fetch(SF_API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SF_API_KEY}` },
          body: JSON.stringify({
            model: 'Pro/moonshotai/Kimi-K2.5',
            messages: [{
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${lastScreenshotBase64}` } },
                { type: 'text', text: visionPrompt },
              ],
            }],
            max_tokens: 800,
            stream: false,
          }),
        })
        if (!response.ok) {
          const errText = await response.text()
          return `多模态分析失败 (${response.status}): ${errText.slice(0, 200)}`
        }
        const data = await response.json()
        return data.choices?.[0]?.message?.content ?? '分析失败，未收到有效响应'
      }

      case 'finish': {
        const { summary } = args as { summary: string }
        return summary || '编辑完成'
      }

      default:
        return `未知工具：${toolName}`
    }
  } catch (err) {
    return `工具执行出错：${String(err)}`
  }
}
