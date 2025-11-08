/**
 * Unit tests for formatCitations node
 *
 * These tests verify citation formatting logic without external dependencies
 */

import {
  formatCitations,
  extractCitationNumbers,
  filterCitationsByAnswer,
} from '@/lib/langgraph/nodes/format-citations'
import { RetrievedChunk, Citation } from '@/types/langgraph'
import { HANDBOOK_CONFIG } from '@/lib/langgraph/config'

describe('formatCitations', () => {
  const mockChunks: RetrievedChunk[] = [
    {
      pinecone_id: 'chunk-1',
      content:
        'This is the full content of the first chunk about academic policies and procedures that should be followed by all faculty members.',
      section_path: 'Academic > Policies',
      section_type: 'policies',
      stakeholder_groups: ['faculty', 'students'],
      approval_authority: 'dean',
      similarity_score: 0.95,
    },
    {
      pinecone_id: 'chunk-2',
      content: 'Second chunk content about grading policies.',
      section_path: 'Academic > Grading',
      section_type: 'policies',
      stakeholder_groups: ['faculty'],
      approval_authority: 'registrar',
      similarity_score: 0.89,
    },
  ]

  it('should format citations from retrieved chunks', async () => {
    const state = {
      retrievedChunks: mockChunks,
      synthesizedAnswer: 'Test answer',
      conversationId: 'test-123',
      currentQuery: 'test query',
      messageHistory: [],
      analyzedQuery: null,
      citations: [],
      error: null,
      requiresClarification: false,
      clarificationRequest: null,
    }

    const result = await formatCitations(state)

    expect(result.citations).toBeDefined()
    expect(result.citations?.length).toBe(2)
    expect(result.citations?.[0].number).toBe(1)
    expect(result.citations?.[0].section_path).toBe('Academic > Policies')
    expect(result.citations?.[0].pinecone_id).toBe('chunk-1')
  })

  it('should truncate content preview to configured length', async () => {
    const longContent = 'A'.repeat(200)
    const state = {
      retrievedChunks: [
        {
          ...mockChunks[0],
          content: longContent,
        },
      ],
      synthesizedAnswer: 'Test answer',
      conversationId: 'test-123',
      currentQuery: 'test query',
      messageHistory: [],
      analyzedQuery: null,
      citations: [],
      error: null,
      requiresClarification: false,
      clarificationRequest: null,
    }

    const result = await formatCitations(state)

    expect(result.citations?.[0].content_preview.length).toBeLessThanOrEqual(
      HANDBOOK_CONFIG.citations.previewLength + 3, // +3 for '...'
    )
    expect(result.citations?.[0].content_preview).toContain('...')
  })

  it('should include metadata based on config', async () => {
    const state = {
      retrievedChunks: mockChunks,
      synthesizedAnswer: 'Test answer',
      conversationId: 'test-123',
      currentQuery: 'test query',
      messageHistory: [],
      analyzedQuery: null,
      citations: [],
      error: null,
      requiresClarification: false,
      clarificationRequest: null,
    }

    const result = await formatCitations(state)

    if (HANDBOOK_CONFIG.citations.includeMetadata.stakeholder_groups) {
      expect(result.citations?.[0].stakeholder_groups).toBeDefined()
    }

    if (HANDBOOK_CONFIG.citations.includeMetadata.approval_authority) {
      expect(result.citations?.[0].approval_authority).toBeDefined()
    }

    if (HANDBOOK_CONFIG.citations.includeMetadata.section_type) {
      expect(result.citations?.[0].section_type).toBeDefined()
    }
  })

  it('should return empty citations for empty chunks', async () => {
    const state = {
      retrievedChunks: [],
      synthesizedAnswer: 'Test answer',
      conversationId: 'test-123',
      currentQuery: 'test query',
      messageHistory: [],
      analyzedQuery: null,
      citations: [],
      error: null,
      requiresClarification: false,
      clarificationRequest: null,
    }

    const result = await formatCitations(state)

    expect(result.citations).toEqual([])
  })
})

describe('extractCitationNumbers', () => {
  it('should extract citation numbers from answer text', () => {
    const answer =
      'According to the handbook [1], grading policies [2] are strict. See also [3].'
    const numbers = extractCitationNumbers(answer)

    expect(numbers).toEqual([1, 2, 3])
  })

  it('should handle duplicate citation numbers', () => {
    const answer = 'First mention [1], second mention [2], and [1] again.'
    const numbers = extractCitationNumbers(answer)

    expect(numbers).toEqual([1, 2])
  })

  it('should return empty array when no citations found', () => {
    const answer = 'No citations in this text.'
    const numbers = extractCitationNumbers(answer)

    expect(numbers).toEqual([])
  })

  it('should sort citation numbers', () => {
    const answer = 'Citations in order: [3], [1], [2]'
    const numbers = extractCitationNumbers(answer)

    expect(numbers).toEqual([1, 2, 3])
  })
})

describe('filterCitationsByAnswer', () => {
  const mockCitations: Citation[] = [
    {
      number: 1,
      section_path: 'Section 1',
      content_preview: 'Preview 1',
      pinecone_id: 'id-1',
      similarity_score: 0.9,
    },
    {
      number: 2,
      section_path: 'Section 2',
      content_preview: 'Preview 2',
      pinecone_id: 'id-2',
      similarity_score: 0.8,
    },
    {
      number: 3,
      section_path: 'Section 3',
      content_preview: 'Preview 3',
      pinecone_id: 'id-3',
      similarity_score: 0.7,
    },
  ]

  it('should filter citations based on answer references', () => {
    const answer = 'According to [1] and [3], policies are important.'
    const filtered = filterCitationsByAnswer(mockCitations, answer)

    expect(filtered.length).toBe(2)
    expect(filtered.map((c) => c.number)).toEqual([1, 3])
  })

  it('should return all citations when none are referenced', () => {
    const answer = 'No citation references here.'
    const filtered = filterCitationsByAnswer(mockCitations, answer)

    expect(filtered.length).toBe(3)
  })
})
