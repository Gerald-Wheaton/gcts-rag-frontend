/**
 * Simplified graph implementation that manually orchestrates the nodes
 * This avoids complex LangGraph API issues while maintaining the same functionality
 */

import type { HandbookGraphStateType } from '@/lib/langgraph/state'
import { analyzeQuery } from '@/lib/langgraph/nodes/analyze-query'
import { embedQuery } from '@/lib/langgraph/nodes/embed-query'
import { retrieveVectors } from '@/lib/langgraph/nodes/retrieve-vectors'
import { rerankChunks } from '@/lib/langgraph/nodes/rerank-chunks'
import { reconstructSections } from '@/lib/langgraph/nodes/reconstruct-sections'
import { synthesizeAnswer } from '@/lib/langgraph/nodes/synthesize-answer'
import { formatCitations } from '@/lib/langgraph/nodes/format-citations'
import { requestClarification } from '@/lib/langgraph/nodes/request-clarification'
import { proposeAction } from '@/lib/langgraph/nodes/propose-action'

/**
 * Execute the handbook RAG pipeline
 *
 * @param initialState - Initial state with query and conversation history
 * @returns Final state after all nodes execute
 */
export async function executeHandbookPipeline(
  initialState: Partial<HandbookGraphStateType>
): Promise<HandbookGraphStateType> {
  let state: HandbookGraphStateType = {
    conversationId: initialState.conversationId || '',
    messageHistory: initialState.messageHistory || [],
    currentQuery: initialState.currentQuery || '',
    analyzedQuery: null,
    retrievedChunks: [],
    synthesizedAnswer: null,
    citations: [],
    error: null,
    requiresClarification: false,
    clarificationRequest: null,
  }

  // Step 1: Analyze Query
  console.log('[Pipeline] Step 1: Analyzing query')
  const analysisResult = await analyzeQuery(state)
  state = { ...state, ...analysisResult }

  if (state.error) {
    console.log('[Pipeline] Error in analysis, stopping')
    return state
  }

  // Check if clarification is needed
  if (state.requiresClarification) {
    console.log('[Pipeline] Clarification needed, requesting clarification')
    const clarificationResult = await requestClarification(state)
    state = { ...state, ...clarificationResult }
    return state
  }

  // Step 2: Embed Query
  console.log('[Pipeline] Step 2: Generating embedding')
  const embeddingResult = await embedQuery(state)
  state = { ...state, ...embeddingResult }

  if (state.error) {
    console.log('[Pipeline] Error in embedding, stopping')
    return state
  }

  // Step 3: Retrieve Vectors
  console.log('[Pipeline] Step 3: Retrieving vectors from Pinecone')
  const retrievalResult = await retrieveVectors(state)
  state = { ...state, ...retrievalResult }

  if (state.error) {
    console.log('[Pipeline] Error in retrieval, stopping')
    return state
  }

  // Step 4: Rerank (if needed)
  if (state.retrievedChunks && state.retrievedChunks.length > 3) {
    console.log('[Pipeline] Step 4: Reranking chunks')
    const rerankResult = await rerankChunks(state)
    state = { ...state, ...rerankResult }

    if (state.error) {
      console.log('[Pipeline] Error in reranking, continuing anyway')
      // Don't stop on reranking error, continue with original chunks
      state.error = null
    }
  } else {
    console.log('[Pipeline] Step 4: Skipping reranking (too few chunks)')
  }

  // Step 5: Reconstruct Sections
  if (state.retrievedChunks && state.retrievedChunks.length > 0) {
    console.log('[Pipeline] Step 5: Reconstructing sections')
    const reconstructionResult = await reconstructSections(state)
    state = { ...state, ...reconstructionResult }

    if (state.error) {
      console.log(
        '[Pipeline] Error in section reconstruction, continuing anyway'
      )
      // Don't stop on reconstruction error, continue with original chunks
      state.error = null
    }
  } else {
    console.log(
      '[Pipeline] Step 5: Skipping section reconstruction (no chunks)'
    )
  }

  // Step 6: Synthesize Answer
  console.log('[Pipeline] Step 6: Synthesizing answer')
  const synthesisResult = await synthesizeAnswer(state)
  state = { ...state, ...synthesisResult }

  if (state.error) {
    console.log('[Pipeline] Error in synthesis, stopping')
    return state
  }

  // Step 7: Format Citations
  console.log('[Pipeline] Step 7: Formatting citations')
  const citationsResult = await formatCitations(state)
  state = { ...state, ...citationsResult }

  if (state.error) {
    console.log('[Pipeline] Error in citation formatting, stopping')
    return state
  }

  console.log('[Pipeline] Pipeline complete')
  return state
}

/**
 * Execute pipeline with streaming callback for answer synthesis
 *
 * @param initialState - Initial state
 * @param onAnswerChunk - Callback for streaming answer chunks
 * @returns Final state
 */
export async function executeHandbookPipelineStreaming(
  initialState: Partial<HandbookGraphStateType>,
  onAnswerChunk: (chunk: string) => void
): Promise<HandbookGraphStateType> {
  let state: HandbookGraphStateType = {
    conversationId: initialState.conversationId || '',
    messageHistory: initialState.messageHistory || [],
    currentQuery: initialState.currentQuery || '',
    analyzedQuery: null,
    retrievedChunks: [],
    synthesizedAnswer: null,
    citations: [],
    error: null,
    requiresClarification: false,
    clarificationRequest: null,
  }

  // Steps 1-4: Same as non-streaming
  const analysisResult = await analyzeQuery(state)
  state = { ...state, ...analysisResult }

  if (state.error || state.requiresClarification) {
    if (state.requiresClarification) {
      const clarificationResult = await requestClarification(state)
      state = { ...state, ...clarificationResult }
    }
    return state
  }

  const embeddingResult = await embedQuery(state)
  state = { ...state, ...embeddingResult }

  if (state.error) return state

  const retrievalResult = await retrieveVectors(state)
  state = { ...state, ...retrievalResult }

  if (state.error) return state

  if (state.retrievedChunks && state.retrievedChunks.length > 3) {
    const rerankResult = await rerankChunks(state)
    state = { ...state, ...rerankResult }
    if (state.error) state.error = null // Don't fail on reranking error
  }

  // Reconstruct sections (if we have chunks)
  if (state.retrievedChunks && state.retrievedChunks.length > 0) {
    const reconstructionResult = await reconstructSections(state)
    state = { ...state, ...reconstructionResult }
    if (state.error) state.error = null // Don't fail on reconstruction error
  }

  // Step 5: Synthesize with streaming
  const { synthesizeAnswerStreaming } = await import(
    '@/lib/langgraph/nodes/synthesize-answer'
  )
  const synthesisResult = await synthesizeAnswerStreaming(state, onAnswerChunk)
  state = { ...state, ...synthesisResult }

  if (state.error) return state

  // Step 6: Format citations
  const citationsResult = await formatCitations(state)
  state = { ...state, ...citationsResult }

  return state
}

/**
 * Execute action proposal pipeline
 * Analyzes conversation history and proposes actionable courses
 *
 * @param params - Conversation ID and optional message history
 * @returns Final state with actionProposal and citations
 */
export async function executeActionProposalPipeline(params: {
  conversationId: string
  messageHistory?: any[]
}): Promise<HandbookGraphStateType> {
  const initialState: HandbookGraphStateType = {
    conversationId: params.conversationId,
    messageHistory: params.messageHistory || [],
    currentQuery: '', // Not needed for action proposal
    analyzedQuery: null,
    retrievedChunks: [],
    synthesizedAnswer: null,
    citations: [],
    error: null,
    requiresClarification: false,
    clarificationRequest: null,
    actionProposal: null,
  }

  console.log('[ActionProposalPipeline] Starting action proposal pipeline')

  // Execute propose action node
  const proposalResult = await proposeAction(initialState)
  const finalState = { ...initialState, ...proposalResult }

  console.log('[ActionProposalPipeline] Pipeline complete:', {
    actionCount: finalState.actionProposal?.actions.length || 0,
    citationCount: finalState.citations.length,
  })

  return finalState
}
