'use server'

import type { Citation } from '@/types/langgraph'

export interface ChatResponse {
  answer: string
  citations: Citation[]
  conversationId: string
  requiresClarification?: boolean
  clarificationRequest?: string
}

/**
 * Get agent response - returns mock data for now
 * In production, this would call your RAG pipeline
 */
export async function getAgentResponse(
  question: string,
  messageCount: number,
  conversationId?: string
): Promise<ChatResponse> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Return mock response with proper Citation objects
  return {
    answer: `This is a mock response to: "${question}". In production, this would query your LangGraph RAG pipeline and return real handbook information with citations.`,
    conversationId: conversationId || crypto.randomUUID(),
    citations: [
      {
        number: 1,
        section_path: 'Section 4.2: Faculty Policies',
        content_preview: 'Mock content preview for faculty policies...',
        pinecone_id: 'mock-1',
        similarity_score: 0.95,
      },
      {
        number: 2,
        section_path: 'Section 3.1: Academic Guidelines',
        content_preview: 'Mock content preview for academic guidelines...',
        pinecone_id: 'mock-2',
        similarity_score: 0.88,
      },
    ],
  }
}

/**
 * Propose action based on conversation history
 * Returns a structured action plan
 */
export async function proposeAction(
  conversationId?: string
): Promise<ChatResponse> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Return mock action proposal with proper Citation objects
  return {
    answer: `Based on our conversation, here's a recommended action plan:\n\n1. Review the relevant handbook sections\n2. Consult with your department chair\n3. Prepare necessary documentation\n4. Submit your request through proper channels\n5. Follow up within 2 weeks`,
    conversationId: conversationId || crypto.randomUUID(),
    citations: [
      {
        number: 1,
        section_path: 'Section 4.2: Sabbatical Leave Policy',
        content_preview: 'Mock sabbatical leave policy content...',
        pinecone_id: 'mock-action-1',
        similarity_score: 0.92,
      },
      {
        number: 2,
        section_path: 'Section 4.2.2: Application Procedures',
        content_preview: 'Mock application procedures content...',
        pinecone_id: 'mock-action-2',
        similarity_score: 0.89,
      },
    ],
  }
}
