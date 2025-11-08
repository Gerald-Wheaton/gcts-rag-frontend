import { NextRequest, NextResponse } from 'next/server'
import {
  getConversation,
  deleteConversation,
  updateConversationTitle,
} from '@/lib/mongodb/conversations'
import { ApiResponse } from '@/types'
import { z } from 'zod'
import { ERROR_MESSAGES } from '@/lib/langgraph/config'

/**
 * GET /api/handbook/conversations/[id]
 *
 * Get a specific conversation by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const conversationId = params.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(conversationId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid conversation ID format',
        } as ApiResponse,
        { status: 400 },
      )
    }

    const conversation = await getConversation(conversationId)

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          error: ERROR_MESSAGES.CONVERSATION_NOT_FOUND,
        } as ApiResponse,
        { status: 404 },
      )
    }

    const response: ApiResponse = {
      success: true,
      data: conversation,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[GET /api/handbook/conversations/[id]] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve conversation',
        message: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse,
      { status: 500 },
    )
  }
}

/**
 * PATCH /api/handbook/conversations/[id]
 *
 * Update conversation (currently supports title updates)
 */
const UpdateConversationSchema = z.object({
  title: z.string().min(1).max(200),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const conversationId = params.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(conversationId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid conversation ID format',
        } as ApiResponse,
        { status: 400 },
      )
    }

    // Check if conversation exists
    const conversation = await getConversation(conversationId)
    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          error: ERROR_MESSAGES.CONVERSATION_NOT_FOUND,
        } as ApiResponse,
        { status: 404 },
      )
    }

    // Parse and validate body
    const body = await request.json()
    const validated = UpdateConversationSchema.parse(body)

    // Update title
    await updateConversationTitle(conversationId, validated.title)

    const response: ApiResponse = {
      success: true,
      data: {
        conversationId,
        title: validated.title,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[PATCH /api/handbook/conversations/[id]] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          message: error.issues[0]?.message || 'Validation error',
        } as ApiResponse,
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update conversation',
        message: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse,
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/handbook/conversations/[id]
 *
 * Delete a conversation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const conversationId = params.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(conversationId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid conversation ID format',
        } as ApiResponse,
        { status: 400 },
      )
    }

    const deleted = await deleteConversation(conversationId)

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: ERROR_MESSAGES.CONVERSATION_NOT_FOUND,
        } as ApiResponse,
        { status: 404 },
      )
    }

    const response: ApiResponse = {
      success: true,
      data: {
        conversationId,
        deleted: true,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[DELETE /api/handbook/conversations/[id]] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete conversation',
        message: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse,
      { status: 500 },
    )
  }
}
