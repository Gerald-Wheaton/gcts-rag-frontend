import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { executeActionProposalPipeline } from '@/lib/langgraph/graph-simple'
import { getConversation } from '@/lib/mongodb/conversations'
import { ERROR_MESSAGES } from '@/lib/langgraph/config'

/**
 * Request schema for action proposal
 */
const ProposeActionRequestSchema = z.object({
  conversationId: z.string().uuid().describe('Conversation ID'),
})

/**
 * POST /api/handbook/propose-action
 *
 * Proposes actionable courses based on conversation history
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json()
    const validatedRequest = ProposeActionRequestSchema.parse(body)

    const { conversationId } = validatedRequest

    console.log(
      `[propose-action] Processing action proposal for conversation: ${conversationId}`
    )

    // Get conversation from MongoDB
    const conversation = await getConversation(conversationId)

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Conversation not found',
        },
        { status: 404 }
      )
    }

    // Get message history
    const messageHistory = conversation.messages || []

    if (messageHistory.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Cannot propose actions without conversation history. Please have a conversation first.',
          actions: [],
          citations: [],
        },
        { status: 400 }
      )
    }

    console.log(
      `[propose-action] Found ${messageHistory.length} messages in conversation`
    )

    // Execute action proposal pipeline
    const finalState = await executeActionProposalPipeline({
      conversationId,
      messageHistory,
    })

    // Check for errors
    if (finalState.error) {
      return NextResponse.json(
        {
          success: false,
          error: finalState.error,
          actions: finalState.actionProposal?.actions || [],
          citations: finalState.citations || [],
        },
        { status: 500 }
      )
    }

    // Format response
    const response = {
      success: true,
      conversationId,
      answer: finalState.synthesizedAnswer || '',
      actions: finalState.actionProposal?.actions || [],
      citations: finalState.citations || [],
      summary: finalState.actionProposal?.summary,
    }

    console.log('[propose-action] Action proposal complete:', {
      actionCount: response.actions.length,
      citationCount: response.citations.length,
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('[/api/handbook/propose-action] Error:', error)

    let errorMessage: string = ERROR_MESSAGES.INTERNAL_ERROR

    if (error instanceof z.ZodError) {
      errorMessage =
        error.issues[0]?.message || ERROR_MESSAGES.INVALID_REQUEST
    } else if (error instanceof Error) {
      errorMessage = error.message
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        actions: [],
        citations: [],
      },
      { status: 500 }
    )
  }
}

