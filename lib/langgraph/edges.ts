import type { HandbookGraphStateType } from '@/lib/langgraph/state'

/**
 * Edge routing functions for conditional graph flow
 *
 * These functions determine which node to execute next based on the current state.
 * They must be pure functions with no side effects.
 */

/**
 * Route after query analysis
 * Determines if clarification is needed or if we should proceed with retrieval
 *
 * @param state - Current graph state
 * @returns Next node name
 */
export function routeAfterAnalysis(state: HandbookGraphStateType): string {
  // Check for errors first
  if (state.error) {
    return 'end'
  }

  // Check if clarification is required
  if (state.requiresClarification) {
    return 'requestClarification'
  }

  // Check if we have a valid analyzed query
  if (!state.analyzedQuery) {
    return 'end'
  }

  // Proceed with embedding
  return 'embedQuery'
}

/**
 * Route after clarification request
 * Always ends after clarification (user needs to respond)
 *
 * @param state - Current graph state
 * @returns Next node name
 */
export function routeAfterClarification(state: HandbookGraphStateType): string {
  return 'end'
}

/**
 * Route after embedding
 * Check if embedding was successful before proceeding to retrieval
 *
 * @param state - Current graph state
 * @returns Next node name
 */
export function routeAfterEmbedding(state: HandbookGraphStateType): string {
  // Check for errors
  if (state.error) {
    return 'end'
  }

  // Check if we have an embedding
  if (!state.analyzedQuery?.embedding) {
    return 'end'
  }

  // Proceed with retrieval
  return 'retrieveVectors'
}

/**
 * Route after retrieval
 * Check if we have chunks to process
 *
 * @param state - Current graph state
 * @returns Next node name
 */
export function routeAfterRetrieval(state: HandbookGraphStateType): string {
  // Check for errors
  if (state.error) {
    return 'end'
  }

  // Check if we have chunks
  if (!state.retrievedChunks || state.retrievedChunks.length === 0) {
    // No chunks found - still proceed to synthesis which will handle empty case
    return 'synthesizeAnswer'
  }

  // If we have multiple chunks, rerank them
  if (state.retrievedChunks.length > 3) {
    return 'rerankChunks'
  }

  // If few chunks, skip reranking and go straight to synthesis
  return 'synthesizeAnswer'
}

/**
 * Route after reranking
 * Proceed to synthesis after reranking
 *
 * @param state - Current graph state
 * @returns Next node name
 */
export function routeAfterReranking(state: HandbookGraphStateType): string {
  // Check for errors
  if (state.error) {
    return 'end'
  }

  return 'synthesizeAnswer'
}

/**
 * Route after synthesis
 * Check if we have an answer to format citations for
 *
 * @param state - Current graph state
 * @returns Next node name
 */
export function routeAfterSynthesis(state: HandbookGraphStateType): string {
  // Check for errors
  if (state.error) {
    return 'end'
  }

  // Check if we have an answer
  if (!state.synthesizedAnswer) {
    return 'end'
  }

  // Proceed to citation formatting
  return 'formatCitations'
}

/**
 * Route after citation formatting
 * Final step - always end
 *
 * @param state - Current graph state
 * @returns Next node name
 */
export function routeAfterCitations(state: HandbookGraphStateType): string {
  return 'end'
}

/**
 * Error handler edge
 * Can be called from any node if there's an error
 *
 * @param state - Current graph state
 * @returns Next node name
 */
export function routeOnError(state: HandbookGraphStateType): string {
  console.error('[routeOnError] Error occurred:', state.error)
  return 'end'
}

/**
 * Helper function to check if state has an error
 *
 * @param state - Current graph state
 * @returns True if state has an error
 */
export function hasError(state: HandbookGraphStateType): boolean {
  return state.error !== null && state.error !== undefined
}

/**
 * Map of node names to their routing functions
 * Used by the graph to determine conditional edges
 */
export const ROUTING_MAP = {
  analyzeQuery: routeAfterAnalysis,
  requestClarification: routeAfterClarification,
  embedQuery: routeAfterEmbedding,
  retrieveVectors: routeAfterRetrieval,
  rerankChunks: routeAfterReranking,
  synthesizeAnswer: routeAfterSynthesis,
  formatCitations: routeAfterCitations,
} as const

/**
 * Node names for graph construction
 */
export const NODE_NAMES = {
  ANALYZE_QUERY: 'analyzeQuery',
  EMBED_QUERY: 'embedQuery',
  RETRIEVE_VECTORS: 'retrieveVectors',
  RERANK_CHUNKS: 'rerankChunks',
  SYNTHESIZE_ANSWER: 'synthesizeAnswer',
  FORMAT_CITATIONS: 'formatCitations',
  REQUEST_CLARIFICATION: 'requestClarification',
} as const
