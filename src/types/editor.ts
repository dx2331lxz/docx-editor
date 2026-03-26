/**
 * AI-operable document format.
 * Designed so AI agents can read/write structured content for auto-formatting (Vibe Editing).
 */

export interface AIDocumentNode {
  type: string
  attrs?: Record<string, unknown>
  content?: AIDocumentNode[]
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  text?: string
}

export interface AIDocument {
  type: 'doc'
  content: AIDocumentNode[]
}

/** AI formatting instruction payload for /api/ai-format */
export interface AIFormatRequest {
  document: AIDocument
  instructions: string
  /** Optional: list of node positions to target */
  targetNodes?: string[]
}

export interface AIFormatResponse {
  document: AIDocument
  changes: AIFormatChange[]
}

export interface AIFormatChange {
  nodeType: string
  description: string
  before: unknown
  after: unknown
}

export interface EditorStats {
  characters: number
  words: number
  paragraphs: number
}
