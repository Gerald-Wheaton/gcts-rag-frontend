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
 * Returns a structured action plan with citations
 */
export async function proposeAction(
  conversationId?: string
): Promise<ChatResponse> {
  if (!conversationId) {
    throw new Error('Conversation ID is required to propose actions')
  }

  try {
    // For server actions, we can call the API route directly
    // In production, use absolute URL; in development, use localhost
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000')
    
    const response = await fetch(`${baseUrl}/api/handbook/propose-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversationId }),
      cache: 'no-store', // Ensure fresh data
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.error || `Failed to propose actions: ${response.statusText}`
      )
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Failed to propose actions')
    }

    return {
      answer: data.answer || '',
      conversationId: data.conversationId || conversationId,
      citations: data.citations || [],
    }
  } catch (error) {
    console.error('[proposeAction] Error:', error)
    throw error instanceof Error
      ? error
      : new Error('Failed to propose actions')
  }
}
