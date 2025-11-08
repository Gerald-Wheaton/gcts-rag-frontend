/**
 * Unit tests for graph edge routing logic
 */

import {
  routeAfterAnalysis,
  routeAfterClarification,
  routeAfterEmbedding,
  routeAfterRetrieval,
  routeAfterReranking,
  routeAfterSynthesis,
  routeAfterCitations,
  hasError,
  NODE_NAMES,
} from '@/lib/langgraph/edges'
import { HandbookGraphStateType } from '@/lib/langgraph/state'

describe('Edge Routing Logic', () => {
  const baseState: HandbookGraphStateType = {
    conversationId: 'test-123',
    messageHistory: [],
    currentQuery: 'test query',
    analyzedQuery: null,
    retrievedChunks: [],
    synthesizedAnswer: null,
    citations: [],
    error: null,
    requiresClarification: false,
    clarificationRequest: null,
  }

  describe('routeAfterAnalysis', () => {
    it('should route to end when there is an error', () => {
      const state = { ...baseState, error: 'Analysis failed' }
      expect(routeAfterAnalysis(state)).toBe('end')
    })

    it('should route to clarification when required', () => {
      const state = {
        ...baseState,
        requiresClarification: true,
        analyzedQuery: {
          intent: 'unclear',
          entities: [],
          implicitFilters: {},
          confidence: 0.5,
          requiresClarification: true,
        },
      }
      expect(routeAfterAnalysis(state)).toBe('requestClarification')
    })

    it('should route to embedQuery when analysis is successful', () => {
      const state = {
        ...baseState,
        analyzedQuery: {
          intent: 'get grading policy',
          entities: ['grading'],
          implicitFilters: {},
          confidence: 0.9,
          requiresClarification: false,
        },
      }
      expect(routeAfterAnalysis(state)).toBe('embedQuery')
    })

    it('should route to end when analyzedQuery is null', () => {
      const state = { ...baseState, analyzedQuery: null }
      expect(routeAfterAnalysis(state)).toBe('end')
    })
  })

  describe('routeAfterClarification', () => {
    it('should always route to end', () => {
      expect(routeAfterClarification(baseState)).toBe('end')
    })
  })

  describe('routeAfterEmbedding', () => {
    it('should route to end when there is an error', () => {
      const state = { ...baseState, error: 'Embedding failed' }
      expect(routeAfterEmbedding(state)).toBe('end')
    })

    it('should route to end when embedding is missing', () => {
      const state = {
        ...baseState,
        analyzedQuery: {
          intent: 'test',
          entities: [],
          implicitFilters: {},
          confidence: 0.9,
          requiresClarification: false,
        },
      }
      expect(routeAfterEmbedding(state)).toBe('end')
    })

    it('should route to retrieveVectors when embedding exists', () => {
      const state = {
        ...baseState,
        analyzedQuery: {
          intent: 'test',
          entities: [],
          implicitFilters: {},
          embedding: new Array(3072).fill(0.1),
          confidence: 0.9,
          requiresClarification: false,
        },
      }
      expect(routeAfterEmbedding(state)).toBe('retrieveVectors')
    })
  })

  describe('routeAfterRetrieval', () => {
    it('should route to end when there is an error', () => {
      const state = { ...baseState, error: 'Retrieval failed' }
      expect(routeAfterRetrieval(state)).toBe('end')
    })

    it('should route to synthesizeAnswer when no chunks found', () => {
      const state = { ...baseState, retrievedChunks: [] }
      expect(routeAfterRetrieval(state)).toBe('synthesizeAnswer')
    })

    it('should route to rerankChunks when more than 3 chunks', () => {
      const state = {
        ...baseState,
        retrievedChunks: [
          {
            pinecone_id: '1',
            content: 'a',
            section_path: 'a',
            section_type: 'a',
            stakeholder_groups: [],
            approval_authority: 'a',
            similarity_score: 0.9,
          },
          {
            pinecone_id: '2',
            content: 'b',
            section_path: 'b',
            section_type: 'b',
            stakeholder_groups: [],
            approval_authority: 'b',
            similarity_score: 0.8,
          },
          {
            pinecone_id: '3',
            content: 'c',
            section_path: 'c',
            section_type: 'c',
            stakeholder_groups: [],
            approval_authority: 'c',
            similarity_score: 0.7,
          },
          {
            pinecone_id: '4',
            content: 'd',
            section_path: 'd',
            section_type: 'd',
            stakeholder_groups: [],
            approval_authority: 'd',
            similarity_score: 0.6,
          },
        ],
      }
      expect(routeAfterRetrieval(state)).toBe('rerankChunks')
    })

    it('should route to synthesizeAnswer when 3 or fewer chunks', () => {
      const state = {
        ...baseState,
        retrievedChunks: [
          {
            pinecone_id: '1',
            content: 'a',
            section_path: 'a',
            section_type: 'a',
            stakeholder_groups: [],
            approval_authority: 'a',
            similarity_score: 0.9,
          },
        ],
      }
      expect(routeAfterRetrieval(state)).toBe('synthesizeAnswer')
    })
  })

  describe('routeAfterReranking', () => {
    it('should route to end when there is an error', () => {
      const state = { ...baseState, error: 'Reranking failed' }
      expect(routeAfterReranking(state)).toBe('end')
    })

    it('should route to synthesizeAnswer on success', () => {
      expect(routeAfterReranking(baseState)).toBe('synthesizeAnswer')
    })
  })

  describe('routeAfterSynthesis', () => {
    it('should route to end when there is an error', () => {
      const state = { ...baseState, error: 'Synthesis failed' }
      expect(routeAfterSynthesis(state)).toBe('end')
    })

    it('should route to end when no answer generated', () => {
      const state = { ...baseState, synthesizedAnswer: null }
      expect(routeAfterSynthesis(state)).toBe('end')
    })

    it('should route to formatCitations when answer exists', () => {
      const state = { ...baseState, synthesizedAnswer: 'Test answer' }
      expect(routeAfterSynthesis(state)).toBe('formatCitations')
    })
  })

  describe('routeAfterCitations', () => {
    it('should always route to end', () => {
      expect(routeAfterCitations(baseState)).toBe('end')
    })
  })

  describe('hasError', () => {
    it('should return true when error exists', () => {
      const state = { ...baseState, error: 'Test error' }
      expect(hasError(state)).toBe(true)
    })

    it('should return false when error is null', () => {
      expect(hasError(baseState)).toBe(false)
    })
  })
})
