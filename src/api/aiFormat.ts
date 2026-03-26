/**
 * Placeholder for the AI formatting API.
 * POST /api/ai-format
 *
 * Replace the fetch URL with your actual backend when ready.
 */

import type { AIFormatRequest, AIFormatResponse } from '../types/editor'

export async function requestAIFormat(payload: AIFormatRequest): Promise<AIFormatResponse> {
  const res = await fetch('/api/ai-format', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(`AI format API error: ${res.status} ${res.statusText}`)
  }

  return res.json() as Promise<AIFormatResponse>
}
