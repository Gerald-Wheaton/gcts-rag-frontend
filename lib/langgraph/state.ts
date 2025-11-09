import { Annotation } from '@langchain/langgraph';
import type {
  ConversationMessage,
  AnalyzedQuery,
  RetrievedChunk,
  Citation,
  ActionProposal,
} from '@/types/langgraph';

/**
 * LangGraph state annotation for the handbook RAG system
 * 
 * This defines the state that flows through the graph nodes.
 * Each node can read from and write to this state.
 */
export const HandbookGraphState = Annotation.Root({
  /**
   * Unique identifier for the conversation
   */
  conversationId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),

  /**
   * Full message history for conversation context
   * Uses concat reducer to append new messages
   */
  messageHistory: Annotation<ConversationMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),

  /**
   * Current user query being processed
   */
  currentQuery: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),

  /**
   * Analyzed query with extracted intent, entities, and metadata
   * Set by analyzeQuery node
   */
  analyzedQuery: Annotation<AnalyzedQuery | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  /**
   * Retrieved chunks from Pinecone + MongoDB
   * Set by retrieveVectors node, modified by rerankChunks node
   */
  retrievedChunks: Annotation<RetrievedChunk[]>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),

  /**
   * Synthesized answer from LLM
   * Set by synthesizeAnswer node
   */
  synthesizedAnswer: Annotation<string | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  /**
   * Formatted citations for the answer
   * Set by formatCitations node
   */
  citations: Annotation<Citation[]>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),

  /**
   * Error message if any step fails
   */
  error: Annotation<string | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  /**
   * Whether the query requires clarification
   * Set by analyzeQuery node
   */
  requiresClarification: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
    default: () => false,
  }),

  /**
   * Clarification question to ask the user
   * Set by requestClarification node
   */
  clarificationRequest: Annotation<string | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  /**
   * Action proposal with 1-3 actionable courses
   * Set by proposeAction node
   */
  actionProposal: Annotation<ActionProposal | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
});

/**
 * Inferred TypeScript type for the graph state
 */
export type HandbookGraphStateType = typeof HandbookGraphState.State;

/**
 * Helper type for partial state updates returned by nodes
 */
export type PartialHandbookState = Partial<HandbookGraphStateType>;

