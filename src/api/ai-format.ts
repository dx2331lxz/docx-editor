/**
 * ai-format.ts — AI 自动排版接口预留（Vibe Editing）
 *
 * 未来对接后端时，替换 formatDocument() 内的实现即可。
 * 前端调用方式示例：
 *
 *   import { formatDocument } from '../api/ai-format'
 *   const result = await formatDocument(editor.getJSON(), '帮我将标题居中，正文行距改为 1.5')
 *   editor.commands.setContent(result.document)
 */

import type { AIDocument, AIFormatRequest, AIFormatResponse } from '../types/editor'

/**
 * 调用 AI 排版接口，返回重新排版后的文档。
 *
 * @param document  - 当前 TipTap JSON 文档（AI 可操作格式）
 * @param instructions - 自然语言排版指令，例如"标题居中，正文首行缩进 2em"
 * @param targetNodes  - 可选：限定需要处理的节点类型列表
 */
export async function formatDocument(
  document: AIDocument,
  instructions: string,
  targetNodes?: string[],
): Promise<AIFormatResponse> {
  // ── 预留接口：后端尚未实现时直接返回原文档 ─────────────────
  // TODO: 替换为真实 API 调用
  //
  // const payload: AIFormatRequest = { document, instructions, targetNodes }
  // const res = await fetch('/api/ai-format', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(payload),
  // })
  // if (!res.ok) throw new Error(`AI API error: ${res.status}`)
  // return res.json()

  console.warn('[ai-format] formatDocument() called — backend not yet connected.')
  console.info('[ai-format] Instructions:', instructions)
  if (targetNodes) console.info('[ai-format] Target nodes:', targetNodes)

  // Return unchanged document as placeholder response
  return {
    document,
    changes: [],
  }
}

// Re-export request/response types for convenience
export type { AIFormatRequest, AIFormatResponse }
