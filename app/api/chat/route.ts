import { NextRequest } from 'next/server';
import openai from '@/lib/openai';
import { Citation } from '@/types';
import { z } from 'zod';

// Request schema validation
const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  conversationId: z.string().optional(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
});

// Helper function to create a readable stream
function createStream() {
  const encoder = new TextEncoder();
  let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;
    },
  });

  const send = (data: string) => {
    if (streamController) {
      streamController.enqueue(encoder.encode(data));
    }
  };

  const close = () => {
    if (streamController) {
      streamController.close();
    }
  };

  return { stream, send, close };
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'Configuration error',
          message: 'OpenAI API key is not configured',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { message, messages: conversationMessages } = ChatRequestSchema.parse(body);

    // Build message history
    const systemMessage = {
      role: 'system' as const,
      content: 'You are a helpful assistant for the GCTS Handbook. Provide accurate, helpful answers based on the handbook content. When referencing specific policies or sections, mention them clearly.',
    };

    const userMessage = {
      role: 'user' as const,
      content: message,
    };

    const allMessages = conversationMessages
      ? [systemMessage, ...conversationMessages, userMessage]
      : [systemMessage, userMessage];

    // Create streaming response
    const { stream, send, close } = createStream();

    // Start OpenAI streaming
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: allMessages,
      temperature: 0.7,
      stream: true,
    });

    // Process stream asynchronously
    (async () => {
      try {
        let fullContent = '';

        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullContent += content;
            // Send content chunk as SSE
            send(`data: ${JSON.stringify({ type: 'content', content })}\n\n`);
          }
        }

        // After streaming completes, send mock citations
        // TODO: Replace with actual citations from RAG system
        const mockCitations: Citation[] = [
          {
            id: '1',
            title: 'Academic Policies',
            source: 'GCTS Handbook',
            content: fullContent.substring(0, 200) + '...',
            sectionPath: 'Academic > Policies',
          },
          {
            id: '2',
            title: 'Faculty Guidelines',
            source: 'GCTS Handbook',
            content: fullContent.substring(100, 300) + '...',
            sectionPath: 'Faculty > Guidelines',
          },
        ];

        // Send citations
        send(`data: ${JSON.stringify({ type: 'citations', citations: mockCitations })}\n\n`);
        
        // Send done signal
        send(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        close();
      } catch (error) {
        send(`data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
        close();
      }
    })();

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          message: error.issues[0]?.message || 'Validation error',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
