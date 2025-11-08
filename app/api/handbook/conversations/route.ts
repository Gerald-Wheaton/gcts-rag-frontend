import { NextRequest, NextResponse } from 'next/server'
import {
  listConversations,
  createConversation,
  getConversationCount,
} from '@/lib/mongodb/conversations'
import { ApiResponse } from '@/types'
import { z } from 'zod'

/**
 * GET /api/handbook/conversations
 *
 * List all conversations for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const userId = searchParams.get('userId') || undefined
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const skip = parseInt(searchParams.get('skip') || '0', 10)

    // Validate parameters
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid limit parameter (must be 1-100)',
        } as ApiResponse,
        { status: 400 },
      )
    }

    if (skip < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid skip parameter (must be >= 0)',
        } as ApiResponse,
        { status: 400 },
      )
    }

    // Get conversations
    const conversations = await listConversations({ userId, limit, skip })
    const total = await getConversationCount(userId)

    const response: ApiResponse = {
      success: true,
      data: {
        conversations,
        total,
        limit,
        skip,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[GET /api/handbook/conversations] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve conversations',
        message: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse,
      { status: 500 },
    )
  }
}

/**
 * POST /api/handbook/conversations
 *
 * Create a new conversation
 */
const CreateConversationSchema = z.object({
  userId: z.string().optional(),
  title: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = CreateConversationSchema.parse(body)

    const conversationId = crypto.randomUUID()
    const title = validated.title || 'New Conversation'
    const userId = validated.userId || 'anonymous'

    const conversation = await createConversation({
      conversationId,
      userId,
      title,
    })

    const response: ApiResponse = {
      success: true,
      data: conversation,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('[POST /api/handbook/conversations] Error:', error)

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
        error: 'Failed to create conversation',
        message: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse,
      { status: 500 },
    )
  }
}
