import { z } from 'zod'

// Core Zod schemas for LangGraph RAG system

/**
 * Analyzed query schema with intent extraction and ambiguity detection
 */
export const AnalyzedQuerySchema = z.object({
  intent: z.string().describe('The primary intent of the user query'),
  entities: z
    .array(z.string())
    .describe('Key entities extracted from the query'),
  implicitFilters: z.object({
    section_type: z
      .string()
      .optional()
      .describe('Auto-determined section type filter'),
    stakeholder_groups: z
      .array(z.string())
      .optional()
      .describe('Auto-determined stakeholder groups'),
  }),
  embedding: z
    .array(z.number())
    .optional()
    .describe('Vector embedding for semantic search'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence score for query understanding'),
  requiresClarification: z
    .boolean()
    .describe('Whether the query needs clarification'),
  clarificationReason: z
    .string()
    .optional()
    .describe('Reason why clarification is needed'),
})

export type AnalyzedQuery = z.infer<typeof AnalyzedQuerySchema>

/**
 * Retrieved chunk schema from Pinecone + MongoDB
 */
export const RetrievedChunkSchema = z.object({
  pinecone_id: z.string().describe('Unique identifier from Pinecone'),
  content: z.string().describe('Full text content of the chunk'),
  section_path: z
    .string()
    .describe('Hierarchical path in handbook (e.g., "Academic > Policies")'),
  precise_section: z
    .string()
    .describe(
      'Last element from MongoDB section_path array (most specific subsection)'
    ),
  section_type: z.string().describe('Category of the section'),
  stakeholder_groups: z
    .array(z.string())
    .describe('Who the content applies to'),
  approval_authority: z.string().describe('Who authorized this content'),
  similarity_score: z
    .number()
    .describe('Cosine similarity score from vector search'),
  relevance_score: z
    .number()
    .optional()
    .describe('LLM-based relevance score (0-10)'),
  doc_id: z.string().optional().describe('Parent document identifier'),
})

export type RetrievedChunk = z.infer<typeof RetrievedChunkSchema>

/**
 * Citation schema for frontend display
 */
export const CitationSchema = z.object({
  number: z
    .number()
    .int()
    .positive()
    .describe('Citation number [1], [2], etc.'),
  section_path: z.string().describe('Location in handbook'),
  precise_section: z
    .string()
    .describe(
      'Last element from MongoDB section_path array (most specific subsection)'
    ),
  content_preview: z.string().describe('Preview of cited content'),
  pinecone_id: z.string().describe('Reference ID for full lookup'),
  similarity_score: z.number().describe('Relevance score'),
  // Optional metadata (toggleable via config)
  stakeholder_groups: z.array(z.string()).optional(),
  approval_authority: z.string().optional(),
  section_type: z.string().optional(),
})

export type Citation = z.infer<typeof CitationSchema>

/**
 * Conversation message schema
 */
export const ConversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']).describe('Message sender role'),
  content: z.string().describe('Message text content'),
  timestamp: z.date().describe('When the message was created'),
  citations: z
    .array(CitationSchema)
    .optional()
    .describe('Citations for assistant messages'),
})

export type ConversationMessage = z.infer<typeof ConversationMessageSchema>

/**
 * LLM structured output schema for query analysis
 */
export const QueryAnalysisOutputSchema = z.object({
  intent: z.string(),
  entities: z.array(z.string()),
  section_type: z.string().nullable(),
  stakeholder_groups: z.array(z.string()).nullable(),
  confidence: z.number().min(0).max(1),
  requires_clarification: z.boolean(),
  clarification_reason: z.string().nullable(),
})

export type QueryAnalysisOutput = z.infer<typeof QueryAnalysisOutputSchema>

/**
 * LLM structured output schema for relevance scoring
 */
export const RelevanceScoringOutputSchema = z.object({
  chunk_scores: z.array(
    z.object({
      index: z.number().int().min(0),
      relevance_score: z.number().min(0).max(10),
      reasoning: z.string(),
    })
  ),
})

export type RelevanceScoringOutput = z.infer<
  typeof RelevanceScoringOutputSchema
>

/**
 * LLM structured output schema for clarification requests
 */
export const ClarificationOutputSchema = z.object({
  clarification_question: z.string(),
  suggested_options: z.array(z.string()).optional(),
  context_needed: z.string(),
})

export type ClarificationOutput = z.infer<typeof ClarificationOutputSchema>

/**
 * Conversation document schema for MongoDB
 */
export const ConversationDocumentSchema = z.object({
  conversationId: z.string().uuid().describe('Unique conversation identifier'),
  userId: z
    .string()
    .default('anonymous')
    .describe('User identifier (for future auth)'),
  title: z.string().describe('Auto-generated conversation title'),
  messages: z.array(ConversationMessageSchema).describe('Full message history'),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastAccessedAt: z.date(),
})

export type ConversationDocument = z.infer<typeof ConversationDocumentSchema>

/**
 * API request/response schemas
 */
export const HandbookQueryRequestSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').describe('User question'),
  conversationId: z
    .string()
    .uuid()
    .optional()
    .describe('Existing conversation ID'),
})

export type HandbookQueryRequest = z.infer<typeof HandbookQueryRequestSchema>

export const HandbookQueryResponseSchema = z.object({
  conversationId: z.string().uuid(),
  answer: z.string().optional().describe('Synthesized answer (streamed)'),
  citations: z.array(CitationSchema),
  error: z.string().optional(),
  requiresClarification: z.boolean().optional(),
  clarificationRequest: z.string().optional(),
})

export type HandbookQueryResponse = z.infer<typeof HandbookQueryResponseSchema>

/**
 * Streaming chunk types for SSE
 */
export type StreamChunkType =
  | 'answer'
  | 'citation'
  | 'error'
  | 'done'
  | 'clarification'

export interface StreamChunk {
  type: StreamChunkType
  data: unknown
}

export interface AnswerStreamChunk extends StreamChunk {
  type: 'answer'
  data: {
    content: string
    conversationId: string
  }
}

export interface CitationStreamChunk extends StreamChunk {
  type: 'citation'
  data: Citation
}

export interface ErrorStreamChunk extends StreamChunk {
  type: 'error'
  data: {
    message: string
    code?: string
  }
}

export interface ClarificationStreamChunk extends StreamChunk {
  type: 'clarification'
  data: {
    question: string
    options?: string[]
    conversationId: string
  }
}

export interface DoneStreamChunk extends StreamChunk {
  type: 'done'
  data: {
    conversationId: string
  }
}
