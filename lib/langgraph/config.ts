/**
 * Configuration for the LangGraph RAG system
 */
export const HANDBOOK_CONFIG = {
  /**
   * Retrieval settings
   */
  retrieval: {
    topK: 7, // Number of chunks to retrieve from Pinecone
    rerankTopK: 5, // Number of chunks to use for synthesis after reranking
    minSimilarity: 0.7, // Minimum similarity score to include chunk
  },

  /**
   * Citation formatting settings
   */
  citations: {
    previewLength: 150, // Character length for content preview
    includeMetadata: {
      stakeholder_groups: true, // Include stakeholder groups in citations
      approval_authority: true, // Include approval authority in citations
      section_type: true, // Include section type in citations
    },
  },

  /**
   * Query ambiguity detection settings
   */
  ambiguity: {
    confidenceThreshold: 0.7, // Below this threshold, query is considered ambiguous
  },

  /**
   * Model configuration
   */
  models: {
    embedding: 'text-embedding-3-large' as const, // OpenAI embedding model (3072 dims)
    chat: 'gpt-4-turbo-preview' as const, // LLM for synthesis (can also use 'gpt-4o')
    temperature: 0.3, // Lower temperature for factual accuracy
    maxTokens: 2000, // Maximum tokens for synthesis response
  },

  /**
   * Retry logic for rate limiting
   */
  retry: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2, // Exponential backoff: 1s, 2s, 4s
  },

  /**
   * MongoDB collection names
   */
  collections: {
    conversations: 'conversations',
    handbookChunks: 'handbook_chunks', // Collection storing chunk content
  },

  /**
   * Pinecone namespace
   */
  pinecone: {
    namespace: process.env.PINECONE_NAMESPACE || 'faculty-handbook-v1',
  },
} as const;

/**
 * System prompts for different LLM tasks
 */
export const SYSTEM_PROMPTS = {
  /**
   * Query analysis prompt
   */
  queryAnalysis: `You are an expert at analyzing queries about a faculty handbook. Your task is to:
1. Identify the user's intent and extract key entities
2. Determine if the query is ambiguous or needs clarification
3. Infer implicit metadata filters (section_type, stakeholder_groups) if applicable
4. Assess confidence in understanding the query (0-1 scale)

Section types: academic, policies, procedures, governance, resources, financial, student_life
Stakeholder groups: students, faculty, staff, administration, all

A query is ambiguous if it:
- Is too vague or lacks specificity
- Has multiple possible interpretations
- References unclear context (e.g., "the deadline" without specifying which)
- Contains contradictory requirements

Provide a confidence score:
- 0.9-1.0: Very clear, specific query
- 0.7-0.89: Clear query with minor ambiguity
- < 0.7: Ambiguous, requires clarification`,

  /**
   * Answer synthesis prompt
   */
  answerSynthesis: (context: string, history: string) => `You are an expert assistant for the GCTS Faculty Handbook. Your role is to provide accurate, helpful answers based strictly on the handbook content.

Context from handbook:
${context}

${history ? `Conversation history:\n${history}\n` : ''}

Instructions:
- Answer based ONLY on the provided context from the handbook
- Reference specific sections naturally in your response
- If the context is insufficient, clearly state what information is missing
- Be concise, authoritative, and professional
- Include inline citations using [1], [2], etc. that correspond to the context chunks
- If multiple sections provide relevant information, synthesize them coherently
- Maintain conversation continuity if there is message history

Do not:
- Make up information not in the context
- Provide advice beyond what the handbook states
- Speculate about policies not covered`,

  /**
   * Relevance scoring prompt
   */
  relevanceScoring: (query: string, chunks: string[]) => `You are evaluating the relevance of handbook sections to a user query.

User query: ${query}

For each of the following chunks, provide a relevance score from 0-10 where:
- 10: Directly answers the query with high precision
- 7-9: Highly relevant and useful
- 4-6: Somewhat relevant, provides context
- 1-3: Tangentially related
- 0: Not relevant

Chunks:
${chunks.map((chunk, idx) => `[${idx}]: ${chunk.substring(0, 200)}...`).join('\n\n')}

Provide scores and brief reasoning for each chunk.`,

  /**
   * Clarification request prompt
   */
  clarificationRequest: (query: string, reason: string) => `You are helping a user clarify their question about a faculty handbook.

User's query: "${query}"

Reason for clarification: ${reason}

Generate a helpful, friendly clarification question that:
- Explains what information is needed
- Provides options when there are multiple interpretations
- References the handbook context
- Is concise and easy to understand

If applicable, suggest 2-4 specific options the user can choose from.`,

  /**
   * Conversation title generation
   */
  titleGeneration: (firstQuery: string) => `Generate a concise, descriptive title (max 60 characters) for a conversation that starts with this question:

"${firstQuery}"

Return only the title, no quotes or extra text.`,
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  OPENAI_KEY_MISSING: 'OpenAI API key is not configured',
  MONGODB_URI_MISSING: 'MongoDB URI is not configured',
  PINECONE_KEY_MISSING: 'Pinecone API key is not configured',
  PINECONE_INDEX_MISSING: 'Pinecone index name is not configured',
  INVALID_REQUEST: 'Invalid request format',
  QUERY_EMPTY: 'Query cannot be empty',
  CONVERSATION_NOT_FOUND: 'Conversation not found',
  EMBEDDING_FAILED: 'Failed to generate query embedding',
  RETRIEVAL_FAILED: 'Failed to retrieve relevant content',
  SYNTHESIS_FAILED: 'Failed to generate answer',
  INTERNAL_ERROR: 'An internal error occurred',
} as const;

