/**
 * Vibe Editing Engine — ReAct loop calling SiliconFlow API
 */
import type { Editor } from '@tiptap/react'
import type { PageConfig } from '../components/PageSetup/PageSetupDialog'
import { VIBE_TOOLS, executeTool } from './vibeEditingTools'
import { TYPOGRAPHY_KNOWLEDGE } from './typographyKnowledge'

import { API } from './apiRoutes'
const API_ENDPOINT = API.aiChat
const API_KEY = ''
const MODEL = 'Pro/moonshotai/Kimi-K2.5'
const MAX_STEPS = 50

const SYSTEM_PROMPT = `你是 DocxEditor 的核心 AI 编辑引擎，拥有完整的文档排版能力。

## 文档字号规范（当前编辑器默认值）
- 正文默认字号：14pt（等同中文"四号"字）
- 标题字号基于正文 14pt 用 em 倍率计算：
  - h1：2em = 28pt
  - h2：1.5em = 21pt
  - h3：1.17em ≈ 16pt
  - h4：1em = 14pt（同正文）
- 默认字体：宋体（SimSun）
- 默认行高：1.6

## 调用工具时字号设置规范
- 设置字号时，使用 pt 单位（如 "14pt"、"28pt"），不使用 px
- 中文字号对照：小二=18pt，三号=16pt，四号=14pt，小四=12pt
- 用 get_document_structure 查看文档结构时，返回值是标题列表和段落数，不含字号信息；如需了解当前字号，可通过调用 get_font_info 工具（如存在）或直接分析 HTML

## 可调用工具
- 文字格式：set_font_size / set_font_family / set_text_color / set_font_bold / set_line_height / set_letter_spacing
- 段落布局：set_text_align / set_paragraph_spacing / set_indent
- 文档结构：normalize_headings / add_table_of_contents / add_watermark / set_page_margins
- 样式主题：apply_document_theme（business/academic/minimal/colorful）/ set_document_font / apply_heading_style（underline/background/bordered/numbered/none）
- 内容清理：remove_extra_spaces / remove_extra_blank_lines / add_section_dividers
- AI改写：convert_to_formal / convert_to_casual / summarize_document（这三个工具会调用 AI 改写，执行较慢）
- 表格美化：format_all_tables（bordered/striped/minimal/colorful）
- 高级操作：batch_replace / highlight_keywords / remove_formatting
- 底层操作：replace_document_html / replace_document_text / apply_style_to_elements
- 样式查询：get_document_styles（获取排版样式）/ get_selection_styles（获取选区样式）
- 截图分析：screenshot_document（文档截图）/ analyze_document_aesthetics（多模态审美分析）

## 工作原则
1. 了解文档阶段（必须按顺序执行）：
   a. 调用 get_document_structure 了解标题结构和段落数量
   b. 调用 get_document_styles 了解当前字号、字体、行高等排版参数
   c. 调用 screenshot_document 对文档截图
   d. 调用 analyze_document_aesthetics 获取多模态审美分析
   e. 综合以上信息，制定编辑计划
2. 根据用户的指令，制定多步编辑计划
3. 组合调用多个工具实现整体效果
4. 优先用主题工具（apply_document_theme）做大规模改版，再用细节工具微调
5. 需要改写文字内容时，用 replace_document_html 重写整篇或局部段落
6. 最多执行 ${MAX_STEPS} 步，超出则必须调用 finish 结束
7. 完成后 finish 并说明做了哪些改动（中文，1-3句话）
8. 有多轮对话上下文时，结合历史理解用户意图，不要重复已完成的操作

${TYPOGRAPHY_KNOWLEDGE}`

export type Message = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  reasoning_content?: string
  tool_call_id?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
}

export type ProgressCallback = (step: { type: 'thinking' | 'thinking_stream' | 'action' | 'observation' | 'done' | 'error' | 'ask_continue'; text: string }) => void

export async function runVibeEditing(
  userInstruction: string,
  editor: Editor,
  onProgress: ProgressCallback,
  onAskContinue?: () => Promise<boolean>,
  onPageConfigChange?: (updater: (prev: PageConfig) => PageConfig) => void,
  conversationHistory?: Message[],
  pageConfig?: PageConfig,
): Promise<string> {
  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...(conversationHistory ?? []),
    { role: 'user', content: userInstruction },
  ]

  let step = 0
  let epoch = 0  // how many 50-step cycles we've run

  while (true) {
    step++
    onProgress({ type: 'thinking_stream', text: '' })

    // Call API with streaming
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: VIBE_TOOLS,
        tool_choice: 'auto',
        max_tokens: 4096,
        temperature: 0.3,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      onProgress({ type: 'error', text: `API 请求失败 (${response.status}): ${errText.slice(0, 200)}` })
      throw new Error(`API error ${response.status}: ${errText}`)
    }

    // Parse SSE stream
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let accumulatedThinking = ''
    let accumulatedContent = ''
    const toolCallsMap: Record<number, { id: string; name: string; arguments: string }> = {}
    let finishReason: string | null = null

    outer: while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const dataStr = line.slice(6).trim()
        if (dataStr === '[DONE]') break outer
        let parsed: Record<string, unknown>
        try { parsed = JSON.parse(dataStr) } catch { continue }
        const choice = (parsed.choices as Array<Record<string, unknown>>)?.[0]
        if (!choice) continue
        const delta = choice.delta as Record<string, unknown> | undefined
        if (!delta) {
          const fr = choice.finish_reason as string | null
          if (fr) finishReason = fr
          continue
        }
        // Accumulate thinking (reasoning_content) if model provides it
        const thinkText = delta.reasoning_content as string | undefined
        if (thinkText) {
          accumulatedThinking += thinkText
          onProgress({ type: 'thinking_stream', text: accumulatedThinking })
        }
        // Accumulate normal content
        const contentText = delta.content as string | undefined
        if (contentText) {
          accumulatedContent += contentText
        }
        // Accumulate tool calls
        const deltaToolCalls = delta.tool_calls as Array<Record<string, unknown>> | undefined
        if (deltaToolCalls) {
          for (const tc of deltaToolCalls) {
            const idx = tc.index as number
            if (!toolCallsMap[idx]) {
              toolCallsMap[idx] = { id: '', name: '', arguments: '' }
            }
            if (tc.id) toolCallsMap[idx].id = tc.id as string
            const fn = tc.function as Record<string, string> | undefined
            if (fn?.name) toolCallsMap[idx].name += fn.name
            if (fn?.arguments) toolCallsMap[idx].arguments += fn.arguments
          }
        }
        const fr = choice.finish_reason as string | null
        if (fr) finishReason = fr
      }
    }

    // Build assistantMsg from accumulated data
    const toolCallsList = Object.values(toolCallsMap)
    const assistantMsg: Message = {
      role: 'assistant',
      content: accumulatedContent || null,
      reasoning_content: accumulatedThinking || undefined,
      ...(toolCallsList.length > 0 ? {
        tool_calls: toolCallsList.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.arguments },
        }))
      } : {}),
    }
    messages.push(assistantMsg)

    // If streaming ended with thinking text but no tool calls, show a placeholder
    if (accumulatedThinking && !assistantMsg.tool_calls?.length && !accumulatedContent) {
      onProgress({ type: 'thinking_stream', text: accumulatedThinking })
    }

    // If the model returned plain text (no tool call), treat as done
    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      const text = assistantMsg.content || '编辑完成'
      onProgress({ type: 'done', text })
      return text
    }

    // Process tool calls (we process one at a time per the spec)
    for (const toolCall of assistantMsg.tool_calls) {
      const toolName = toolCall.function.name
      let toolArgs: Record<string, unknown> = {}
      try {
        toolArgs = JSON.parse(toolCall.function.arguments || '{}')
      } catch {
        toolArgs = {}
      }

      onProgress({ type: 'action', text: `调用工具：${toolName}` })

      const observation = await executeTool(toolName, toolArgs, editor, onPageConfigChange, pageConfig)
      onProgress({ type: 'observation', text: observation.slice(0, 300) })

      // Add tool result to messages
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: observation,
      })

      // If this is finish, we're done
      if (toolName === 'finish') {
        const summary = (toolArgs as { summary?: string }).summary || observation
        onProgress({ type: 'done', text: summary })
        return summary
      }
    }

    // Check step limit for this epoch
    if (step >= MAX_STEPS) {
      onProgress({ type: 'ask_continue', text: `已执行 ${(epoch + 1) * MAX_STEPS} 步，是否继续？` })
      const shouldContinue = onAskContinue ? await onAskContinue() : false
      if (!shouldContinue) {
        const forcedMsg = `已执行 ${(epoch + 1) * MAX_STEPS} 步，编辑结束。`
        onProgress({ type: 'done', text: forcedMsg })
        return forcedMsg
      }
      // Reset for next epoch
      step = 0
      epoch++
    }
  }
}
