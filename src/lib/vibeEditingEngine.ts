/**
 * Vibe Editing Engine — ReAct loop calling SiliconFlow API
 */
import type { Editor } from '@tiptap/react'
import { VIBE_TOOLS, executeTool } from './vibeEditingTools'

const API_ENDPOINT = 'https://api.siliconflow.cn/v1/chat/completions'
const API_KEY = 'sk-tsecqgrifovrucwvcdvcyzzjluxrpsehbishnwgamhjozwsw'
const MODEL = 'Pro/moonshotai/Kimi-K2.5'
const MAX_STEPS = 50

const SYSTEM_PROMPT = `你是 DocxEditor 的核心 AI 编辑引擎，拥有完整的文档排版能力。

你可以调用以下类别的工具：
- 文字格式：set_font_size / set_font_family / set_text_color / set_font_bold / set_line_height / set_letter_spacing
- 段落布局：set_text_align / set_paragraph_spacing / set_indent
- 文档结构：normalize_headings / add_table_of_contents / add_watermark / set_page_margins
- 样式主题：apply_document_theme（business/academic/minimal/colorful）/ set_document_font / apply_heading_style（underline/background/bordered/numbered/none）
- 内容清理：remove_extra_spaces / remove_extra_blank_lines / add_section_dividers
- AI改写：convert_to_formal / convert_to_casual / summarize_document（这三个工具会调用 AI 改写，执行较慢）
- 表格美化：format_all_tables（bordered/striped/minimal/colorful）
- 高级操作：batch_replace / highlight_keywords / remove_formatting
- 底层操作：replace_document_html / replace_document_text / apply_style_to_elements

工作原则：
1. 先用 get_document_structure 了解文档结构
2. 根据用户的 vibe 指令，制定多步编辑计划
3. 组合调用多个工具实现整体效果
4. 优先用主题工具（apply_document_theme）做大规模改版，再用细节工具微调
5. 需要改写文字内容时，用 replace_document_html 重写整篇或局部段落
6. 最多执行 ${MAX_STEPS} 步，超出则必须调用 finish 结束
7. 完成后 finish 并说明做了哪些改动（中文，1-3句话）`

type Message = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_call_id?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
}

export type ProgressCallback = (step: { type: 'thinking' | 'action' | 'observation' | 'done' | 'error' | 'ask_continue'; text: string }) => void

export async function runVibeEditing(
  userInstruction: string,
  editor: Editor,
  onProgress: ProgressCallback,
  onAskContinue?: () => Promise<boolean>,
): Promise<string> {
  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userInstruction },
  ]

  let step = 0
  let epoch = 0  // how many 50-step cycles we've run

  while (true) {
    step++
    onProgress({ type: 'thinking', text: `步骤 ${epoch * MAX_STEPS + step}：思考中…` })

    // Call API
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
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      onProgress({ type: 'error', text: `API 请求失败 (${response.status}): ${errText.slice(0, 200)}` })
      throw new Error(`API error ${response.status}: ${errText}`)
    }

    const data = await response.json()
    const choice = data.choices?.[0]
    if (!choice) {
      onProgress({ type: 'error', text: 'API 返回数据异常' })
      throw new Error('No choice in API response')
    }

    const assistantMsg = choice.message as Message
    messages.push(assistantMsg)

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

      const observation = await executeTool(toolName, toolArgs, editor)
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
