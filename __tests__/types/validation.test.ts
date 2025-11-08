/**
 * Unit tests for Zod schema validation
 */

import {
  AnalyzedQuerySchema,
  RetrievedChunkSchema,
  CitationSchema,
  ConversationMessageSchema,
  HandbookQueryRequestSchema,
  QueryAnalysisOutputSchema,
  RelevanceScoringOutputSchema,
  ClarificationOutputSchema,
} from '@/types/langgraph';
import { z } from 'zod';

describe('Schema Validation', () => {
  describe('AnalyzedQuerySchema', () => {
    it('should validate a correct analyzed query', () => {
      const validQuery = {
        intent: 'Find grading policy',
        entities: ['grading', 'policy'],
        implicitFilters: {
          section_type: 'policies',
          stakeholder_groups: ['faculty'],
        },
        confidence: 0.95,
        requiresClarification: false,
      };

      expect(() => AnalyzedQuerySchema.parse(validQuery)).not.toThrow();
    });

    it('should reject query with confidence out of range', () => {
      const invalidQuery = {
        intent: 'test',
        entities: [],
        implicitFilters: {},
        confidence: 1.5, // Invalid: > 1
        requiresClarification: false,
      };

      expect(() => AnalyzedQuerySchema.parse(invalidQuery)).toThrow(z.ZodError);
    });

    it('should accept query with optional embedding', () => {
      const queryWithEmbedding = {
        intent: 'test',
        entities: [],
        implicitFilters: {},
        confidence: 0.8,
        requiresClarification: false,
        embedding: new Array(3072).fill(0.1),
      };

      expect(() => AnalyzedQuerySchema.parse(queryWithEmbedding)).not.toThrow();
    });
  });

  describe('RetrievedChunkSchema', () => {
    it('should validate a correct chunk', () => {
      const validChunk = {
        pinecone_id: 'test-id-123',
        content: 'This is the content of the chunk.',
        section_path: 'Academic > Policies',
        section_type: 'policies',
        stakeholder_groups: ['faculty', 'students'],
        approval_authority: 'dean',
        similarity_score: 0.92,
      };

      expect(() => RetrievedChunkSchema.parse(validChunk)).not.toThrow();
    });

    it('should accept chunk with optional relevance score', () => {
      const chunkWithRelevance = {
        pinecone_id: 'test-id',
        content: 'Content',
        section_path: 'Path',
        section_type: 'type',
        stakeholder_groups: [],
        approval_authority: 'auth',
        similarity_score: 0.8,
        relevance_score: 8.5,
      };

      expect(() => RetrievedChunkSchema.parse(chunkWithRelevance)).not.toThrow();
    });
  });

  describe('CitationSchema', () => {
    it('should validate a correct citation', () => {
      const validCitation = {
        number: 1,
        section_path: 'Academic > Grading',
        content_preview: 'This is a preview of the content...',
        pinecone_id: 'chunk-123',
        similarity_score: 0.89,
      };

      expect(() => CitationSchema.parse(validCitation)).not.toThrow();
    });

    it('should reject negative citation number', () => {
      const invalidCitation = {
        number: -1,
        section_path: 'Path',
        content_preview: 'Preview',
        pinecone_id: 'id',
        similarity_score: 0.8,
      };

      expect(() => CitationSchema.parse(invalidCitation)).toThrow(z.ZodError);
    });

    it('should accept citation with optional metadata', () => {
      const citationWithMetadata = {
        number: 1,
        section_path: 'Path',
        content_preview: 'Preview',
        pinecone_id: 'id',
        similarity_score: 0.8,
        stakeholder_groups: ['faculty'],
        approval_authority: 'dean',
        section_type: 'policies',
      };

      expect(() => CitationSchema.parse(citationWithMetadata)).not.toThrow();
    });
  });

  describe('ConversationMessageSchema', () => {
    it('should validate a correct message', () => {
      const validMessage = {
        role: 'user',
        content: 'What is the grading policy?',
        timestamp: new Date(),
      };

      expect(() => ConversationMessageSchema.parse(validMessage)).not.toThrow();
    });

    it('should reject invalid role', () => {
      const invalidMessage = {
        role: 'invalid-role',
        content: 'Test',
        timestamp: new Date(),
      };

      expect(() => ConversationMessageSchema.parse(invalidMessage)).toThrow(z.ZodError);
    });

    it('should accept message with citations', () => {
      const messageWithCitations = {
        role: 'assistant',
        content: 'Answer with citations [1]',
        timestamp: new Date(),
        citations: [{
          number: 1,
          section_path: 'Path',
          content_preview: 'Preview',
          pinecone_id: 'id',
          similarity_score: 0.8,
        }],
      };

      expect(() => ConversationMessageSchema.parse(messageWithCitations)).not.toThrow();
    });
  });

  describe('HandbookQueryRequestSchema', () => {
    it('should validate a correct request', () => {
      const validRequest = {
        query: 'What are the grading policies?',
        conversationId: '550e8400-e29b-41d4-a716-446655440000',
      };

      expect(() => HandbookQueryRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should reject empty query', () => {
      const invalidRequest = {
        query: '',
        conversationId: '550e8400-e29b-41d4-a716-446655440000',
      };

      expect(() => HandbookQueryRequestSchema.parse(invalidRequest)).toThrow(z.ZodError);
    });

    it('should accept request without conversationId', () => {
      const requestWithoutId = {
        query: 'Valid query',
      };

      expect(() => HandbookQueryRequestSchema.parse(requestWithoutId)).not.toThrow();
    });
  });

  describe('QueryAnalysisOutputSchema', () => {
    it('should validate LLM query analysis output', () => {
      const validOutput = {
        intent: 'Find policy information',
        entities: ['grading', 'policy'],
        section_type: 'policies',
        stakeholder_groups: ['faculty'],
        confidence: 0.9,
        requires_clarification: false,
        clarification_reason: null,
      };

      expect(() => QueryAnalysisOutputSchema.parse(validOutput)).not.toThrow();
    });

    it('should accept null values for optional fields', () => {
      const outputWithNulls = {
        intent: 'test',
        entities: [],
        section_type: null,
        stakeholder_groups: null,
        confidence: 0.8,
        requires_clarification: false,
        clarification_reason: null,
      };

      expect(() => QueryAnalysisOutputSchema.parse(outputWithNulls)).not.toThrow();
    });
  });

  describe('RelevanceScoringOutputSchema', () => {
    it('should validate LLM relevance scoring output', () => {
      const validOutput = {
        chunk_scores: [
          { index: 0, relevance_score: 9.2, reasoning: 'Highly relevant' },
          { index: 1, relevance_score: 7.5, reasoning: 'Somewhat relevant' },
        ],
      };

      expect(() => RelevanceScoringOutputSchema.parse(validOutput)).not.toThrow();
    });

    it('should reject invalid score range', () => {
      const invalidOutput = {
        chunk_scores: [
          { index: 0, relevance_score: 15, reasoning: 'Invalid score' },
        ],
      };

      expect(() => RelevanceScoringOutputSchema.parse(invalidOutput)).toThrow(z.ZodError);
    });
  });

  describe('ClarificationOutputSchema', () => {
    it('should validate LLM clarification output', () => {
      const validOutput = {
        clarification_question: 'Which policy are you asking about?',
        suggested_options: ['Grading Policy', 'Attendance Policy', 'Academic Integrity'],
        context_needed: 'Specific policy type',
      };

      expect(() => ClarificationOutputSchema.parse(validOutput)).not.toThrow();
    });

    it('should accept output without suggested options', () => {
      const outputWithoutOptions = {
        clarification_question: 'Can you be more specific?',
        context_needed: 'More details needed',
      };

      expect(() => ClarificationOutputSchema.parse(outputWithoutOptions)).not.toThrow();
    });
  });
});

