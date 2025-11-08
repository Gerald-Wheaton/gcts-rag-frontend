import { NextRequest } from 'next/server'
import { HandbookQueryRequestSchema } from '@/types/langgraph'
import { executeHandbookPipelineStreaming } from '@/lib/langgraph/graph-simple'
import {
  createConversation,
  getConversation,
  addMessageToConversation,
  updateConversationTitle,
} from '@/lib/mongodb/conversations'
import { ChatOpenAI } from '@langchain/openai'
import { SYSTEM_PROMPTS, ERROR_MESSAGES } from '@/lib/langgraph/config'
import { z } from 'zod'

/**
 * POST /api/handbook/query
 *
 * Main query endpoint with streaming support
 * Processes user queries through the LangGraph RAG pipeline
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  // Create readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Parse and validate request
        const body = await request.json()
        const validatedRequest = HandbookQueryRequestSchema.parse(body)

        const { query, conversationId } = validatedRequest

        // Generate conversation ID if not provided
        const convId = conversationId || crypto.randomUUID()

        // Get or create conversation
        let conversation = conversationId
          ? await getConversation(conversationId)
          : null

        if (!conversation) {
          // Create new conversation with temporary title
          conversation = await createConversation({
            conversationId: convId,
            title: 'New Conversation',
          })
        }

        // Get message history
        const messageHistory = conversation.messages || []

        // Send conversation ID first
        const convIdChunk = `data: ${JSON.stringify({
          type: 'conversationId',
          data: { conversationId: convId },
        })}\n\n`
        controller.enqueue(encoder.encode(convIdChunk))

        // Execute pipeline with streaming
        const finalState = await executeHandbookPipelineStreaming(
          {
            conversationId: convId,
            currentQuery: query,
            messageHistory,
          },
          (chunk: string) => {
            // Stream answer chunks
            const answerChunk = `data: ${JSON.stringify({
              type: 'answer',
              data: { content: chunk, conversationId: convId },
            })}\n\n`
            controller.enqueue(encoder.encode(answerChunk))
          },
        )

        // Check for errors
        if (finalState.error) {
          const errorChunk = `data: ${JSON.stringify({
            type: 'error',
            data: { message: finalState.error },
          })}\n\n`
          controller.enqueue(encoder.encode(errorChunk))

          await addMessageToConversation(convId, {
            role: 'assistant',
            content: `Error: ${finalState.error}`,
            timestamp: new Date(),
          })

          controller.close()
          return
        }

        // Check for clarification
        if (
          finalState.requiresClarification &&
          finalState.clarificationRequest
        ) {
          const clarificationChunk = `data: ${JSON.stringify({
            type: 'clarification',
            data: {
              question: finalState.clarificationRequest,
              conversationId: convId,
            },
          })}\n\n`
          controller.enqueue(encoder.encode(clarificationChunk))

          await addMessageToConversation(convId, {
            role: 'user',
            content: query,
            timestamp: new Date(),
          })
          await addMessageToConversation(convId, {
            role: 'assistant',
            content: finalState.clarificationRequest,
            timestamp: new Date(),
          })

          const doneChunk = `data: ${JSON.stringify({
            type: 'done',
            data: { conversationId: convId },
          })}\n\n`
          controller.enqueue(encoder.encode(doneChunk))
          controller.close()
          return
        }

        // Send citations
        if (finalState.citations && finalState.citations.length > 0) {
          for (const citation of finalState.citations) {
            const citationChunk = `data: ${JSON.stringify({
              type: 'citation',
              data: citation,
            })}\n\n`
            controller.enqueue(encoder.encode(citationChunk))
          }
        }

        // Save messages to conversation
        await addMessageToConversation(convId, {
          role: 'user',
          content: query,
          timestamp: new Date(),
        })

        if (finalState.synthesizedAnswer) {
          await addMessageToConversation(convId, {
            role: 'assistant',
            content: finalState.synthesizedAnswer,
            timestamp: new Date(),
            citations: finalState.citations,
          })
        }

        // Generate and update conversation title if this is the first message
        if (messageHistory.length === 0 && finalState.synthesizedAnswer) {
          try {
            const llm = new ChatOpenAI({
              modelName: 'gpt-4-turbo-preview',
              temperature: 0.5,
              apiKey: process.env.OPENAI_API_KEY,
            })

            const titlePrompt = SYSTEM_PROMPTS.titleGeneration(query)
            const titleResponse = await llm.invoke(titlePrompt)
            const title = (titleResponse.content as string).trim()

            await updateConversationTitle(convId, title)
          } catch (error) {
            console.error('Failed to generate title:', error)
            // Fallback title
            await updateConversationTitle(convId, query.substring(0, 60))
          }
        }

        // Send done signal
        const doneChunk = `data: ${JSON.stringify({
          type: 'done',
          data: { conversationId: convId },
        })}\n\n`
        controller.enqueue(encoder.encode(doneChunk))

        controller.close()
      } catch (error) {
        console.error('[/api/handbook/query] Error:', error)

        let errorMessage: string = ERROR_MESSAGES.INTERNAL_ERROR

        if (error instanceof z.ZodError) {
          errorMessage =
            error.issues[0]?.message || ERROR_MESSAGES.INVALID_REQUEST
        } else if (error instanceof Error) {
          errorMessage = error.message
        }

        const errorChunk = `data: ${JSON.stringify({
          type: 'error',
          data: { message: errorMessage },
        })}\n\n`
        controller.enqueue(encoder.encode(errorChunk))
        controller.close()
      }
    },
  })

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
