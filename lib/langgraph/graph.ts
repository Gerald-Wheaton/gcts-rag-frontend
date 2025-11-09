import { StateGraph, END } from '@langchain/langgraph'
import { HandbookGraphState } from '@/lib/langgraph/state'
import { analyzeQuery } from '@/lib/langgraph/nodes/analyze-query'
import { embedQuery } from '@/lib/langgraph/nodes/embed-query'
import { retrieveVectors } from '@/lib/langgraph/nodes/retrieve-vectors'
import { rerankChunks } from '@/lib/langgraph/nodes/rerank-chunks'
import { reconstructSections } from '@/lib/langgraph/nodes/reconstruct-sections'
import { synthesizeAnswer } from '@/lib/langgraph/nodes/synthesize-answer'
import { formatCitations } from '@/lib/langgraph/nodes/format-citations'
import { requestClarification } from '@/lib/langgraph/nodes/request-clarification'
import { NODE_NAMES } from '@/lib/langgraph/edges'

/**
 * Create the handbook RAG graph
 *
 * Graph flow:
 * START → analyzeQuery → (conditional)
 *   ├─ IF requiresClarification: → requestClarification → END
 *   └─ ELSE: → embedQuery → retrieveVectors → (conditional)
 *       ├─ IF > 3 chunks: → rerankChunks → reconstructSections → synthesizeAnswer → formatCitations → END
 *       └─ ELSE: → reconstructSections → synthesizeAnswer → formatCitations → END
 *
 * @returns Compiled LangGraph workflow
 */
export function createHandbookGraph() {
  // Create workflow with state annotation
  const workflow = new StateGraph(HandbookGraphState)

  // Add all nodes
  workflow.addNode(NODE_NAMES.ANALYZE_QUERY, analyzeQuery)
  workflow.addNode(NODE_NAMES.EMBED_QUERY, embedQuery)
  workflow.addNode(NODE_NAMES.RETRIEVE_VECTORS, retrieveVectors)
  workflow.addNode(NODE_NAMES.RERANK_CHUNKS, rerankChunks)
  workflow.addNode(NODE_NAMES.RECONSTRUCT_SECTIONS, reconstructSections)
  workflow.addNode(NODE_NAMES.SYNTHESIZE_ANSWER, synthesizeAnswer)
  workflow.addNode(NODE_NAMES.FORMAT_CITATIONS, formatCitations)
  workflow.addNode(NODE_NAMES.REQUEST_CLARIFICATION, requestClarification)

  // Set entry point
  workflow.setEntryPoint(NODE_NAMES.ANALYZE_QUERY as any)

  // Add conditional routing after analysis
  workflow.addConditionalEdges(
    NODE_NAMES.ANALYZE_QUERY as any,
    (state) => {
      // Check for errors
      if (state.error) {
        return 'end'
      }

      // Check if clarification is needed
      if (state.requiresClarification) {
        return NODE_NAMES.REQUEST_CLARIFICATION
      }

      // Proceed with embedding
      return NODE_NAMES.EMBED_QUERY
    },
    {
      [NODE_NAMES.REQUEST_CLARIFICATION]: NODE_NAMES.REQUEST_CLARIFICATION as any,
      [NODE_NAMES.EMBED_QUERY]: NODE_NAMES.EMBED_QUERY as any,
      end: END,
    }
  )

  // Clarification always ends (user needs to respond)
  workflow.addEdge(NODE_NAMES.REQUEST_CLARIFICATION as any, END)

  // After embedding, check for errors then proceed to retrieval
  workflow.addConditionalEdges(
    NODE_NAMES.EMBED_QUERY as any,
    (state) => {
      if (state.error || !state.analyzedQuery?.embedding) {
        return 'end'
      }
      return NODE_NAMES.RETRIEVE_VECTORS
    },
    {
      [NODE_NAMES.RETRIEVE_VECTORS]: NODE_NAMES.RETRIEVE_VECTORS as any,
      end: END,
    }
  )

  // After retrieval, decide whether to rerank or go straight to section reconstruction
  workflow.addConditionalEdges(
    NODE_NAMES.RETRIEVE_VECTORS as any,
    (state) => {
      if (state.error) {
        return 'end'
      }

      // If no chunks, still go to synthesis (handles empty case)
      if (!state.retrievedChunks || state.retrievedChunks.length === 0) {
        return NODE_NAMES.SYNTHESIZE_ANSWER
      }

      // If multiple chunks, rerank them
      if (state.retrievedChunks.length > 3) {
        return NODE_NAMES.RERANK_CHUNKS
      }

      // Few chunks, skip reranking and go to section reconstruction
      return NODE_NAMES.RECONSTRUCT_SECTIONS
    },
    {
      [NODE_NAMES.RERANK_CHUNKS]: NODE_NAMES.RERANK_CHUNKS as any,
      [NODE_NAMES.RECONSTRUCT_SECTIONS]: NODE_NAMES.RECONSTRUCT_SECTIONS as any,
      [NODE_NAMES.SYNTHESIZE_ANSWER]: NODE_NAMES.SYNTHESIZE_ANSWER as any,
      end: END,
    }
  )

  // After reranking, proceed to section reconstruction
  workflow.addConditionalEdges(
    NODE_NAMES.RERANK_CHUNKS as any,
    (state) => {
      if (state.error) {
        return 'end'
      }
      return NODE_NAMES.RECONSTRUCT_SECTIONS
    },
    {
      [NODE_NAMES.RECONSTRUCT_SECTIONS]: NODE_NAMES.RECONSTRUCT_SECTIONS as any,
      end: END,
    }
  )

  // After section reconstruction, proceed to synthesis
  workflow.addConditionalEdges(
    NODE_NAMES.RECONSTRUCT_SECTIONS as any,
    (state) => {
      if (state.error) {
        return 'end'
      }
      return NODE_NAMES.SYNTHESIZE_ANSWER
    },
    {
      [NODE_NAMES.SYNTHESIZE_ANSWER]: NODE_NAMES.SYNTHESIZE_ANSWER as any,
      end: END,
    }
  )

  // After synthesis, proceed to citation formatting
  workflow.addConditionalEdges(
    NODE_NAMES.SYNTHESIZE_ANSWER as any,
    (state) => {
      if (state.error || !state.synthesizedAnswer) {
        return 'end'
      }
      return NODE_NAMES.FORMAT_CITATIONS
    },
    {
      [NODE_NAMES.FORMAT_CITATIONS]: NODE_NAMES.FORMAT_CITATIONS as any,
      end: END,
    }
  )

  // Citation formatting always ends
  workflow.addEdge(NODE_NAMES.FORMAT_CITATIONS as any, END)

  // Compile the graph
  const app = workflow.compile()

  return app
}

/**
 * Invoke the handbook graph with a query
 *
 * @param query - User query
 * @param conversationId - Conversation ID
 * @param messageHistory - Previous messages in conversation
 * @returns Final state after graph execution
 */
export async function invokeHandbookGraph(params: {
  query: string
  conversationId: string
  messageHistory?: any[]
}) {
  const graph = createHandbookGraph()

  const initialState = {
    conversationId: params.conversationId,
    currentQuery: params.query,
    messageHistory: params.messageHistory || [],
  }

  const result = await graph.invoke(initialState)

  return result
}

/**
 * Stream the handbook graph execution
 * Useful for getting intermediate results and streaming answers
 *
 * @param query - User query
 * @param conversationId - Conversation ID
 * @param messageHistory - Previous messages in conversation
 * @returns AsyncIterator of state updates
 */
export async function* streamHandbookGraph(params: {
  query: string
  conversationId: string
  messageHistory?: any[]
}) {
  const graph = createHandbookGraph()

  const initialState = {
    conversationId: params.conversationId,
    currentQuery: params.query,
    messageHistory: params.messageHistory || [],
    analyzedQuery: null,
    retrievedChunks: [],
    synthesizedAnswer: null,
    citations: [],
    error: null,
    requiresClarification: false,
    clarificationRequest: null,
  }

  const stream = await graph.stream(initialState)
  for await (const update of stream) {
    yield update
  }
}
