import { ChatOpenAI } from '@langchain/openai';
import { HANDBOOK_CONFIG, SYSTEM_PROMPTS } from '@/lib/langgraph/config';
import type { HandbookGraphStateType, PartialHandbookState } from '@/lib/langgraph/state';

/**
 * Answer Synthesizer Node
 * 
 * Generates natural language answer from retrieved chunks using LLM
 * Supports streaming responses
 * 
 * @param state - Current graph state
 * @returns Partial state with synthesizedAnswer
 */
export async function synthesizeAnswer(state: HandbookGraphStateType): Promise<PartialHandbookState> {
  try {
    const { retrievedChunks, currentQuery, analyzedQuery, messageHistory } = state;

    // Validate input
    if (!retrievedChunks || retrievedChunks.length === 0) {
      return {
        synthesizedAnswer: 'I could not find relevant information in the handbook to answer your question. Please try rephrasing or asking about a different topic.',
      };
    }

    if (!analyzedQuery) {
      return {
        error: 'No analyzed query available for synthesis',
      };
    }

    console.log(`[synthesizeAnswer] Synthesizing answer from ${retrievedChunks.length} chunks`);

    // Build context from retrieved chunks
    const context = retrievedChunks
      .map((chunk, idx) => {
        return `[${idx + 1}] Section: ${chunk.section_path}
Content: ${chunk.content}`;
      })
      .join('\n\n');

    // Build conversation history context (last 4 exchanges for coherence)
    const conversationContext = messageHistory.length > 0
      ? messageHistory
          .slice(-8) // Last 8 messages (4 exchanges)
          .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n')
      : '';

    // Initialize LLM
    const llm = new ChatOpenAI({
      modelName: HANDBOOK_CONFIG.models.chat,
      temperature: HANDBOOK_CONFIG.models.temperature,
      maxTokens: HANDBOOK_CONFIG.models.maxTokens,
      apiKey: process.env.OPENAI_API_KEY,
      streaming: false, // We'll handle streaming at the API level
    });

    // Construct synthesis prompt
    const systemPrompt = SYSTEM_PROMPTS.answerSynthesis(context, conversationContext);
    
    const userPrompt = `Based on the handbook context provided, please answer this question:

"${currentQuery}"

Remember to:
- Use only information from the provided context
- Include inline citations [1], [2], etc.
- Be clear about any limitations in the available information
- Maintain continuity with the conversation history if relevant`;

    // Generate answer
    const response = await llm.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    const answer = response.content as string;

    if (!answer || answer.trim() === '') {
      return {
        error: 'Failed to generate answer from LLM',
      };
    }

    console.log('[synthesizeAnswer] Answer generated successfully:', {
      length: answer.length,
      chunks_used: retrievedChunks.length,
    });

    return {
      synthesizedAnswer: answer,
    };
  } catch (error) {
    console.error('[synthesizeAnswer] Error:', error);
    return {
      error: `Failed to synthesize answer: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Streaming version of answer synthesizer
 * Used by the API endpoint for real-time streaming
 * 
 * @param state - Current graph state
 * @param onChunk - Callback for each streamed chunk
 * @returns Partial state with synthesizedAnswer
 */
export async function synthesizeAnswerStreaming(
  state: HandbookGraphStateType,
  onChunk: (chunk: string) => void
): Promise<PartialHandbookState> {
  try {
    const { retrievedChunks, currentQuery, analyzedQuery, messageHistory } = state;

    // Validate input
    if (!retrievedChunks || retrievedChunks.length === 0) {
      const fallbackMessage = 'I could not find relevant information in the handbook to answer your question. Please try rephrasing or asking about a different topic.';
      onChunk(fallbackMessage);
      return {
        synthesizedAnswer: fallbackMessage,
      };
    }

    if (!analyzedQuery) {
      return {
        error: 'No analyzed query available for synthesis',
      };
    }

    console.log(`[synthesizeAnswerStreaming] Synthesizing answer from ${retrievedChunks.length} chunks`);

    // Build context from retrieved chunks
    const context = retrievedChunks
      .map((chunk, idx) => {
        return `[${idx + 1}] Section: ${chunk.section_path}
Content: ${chunk.content}`;
      })
      .join('\n\n');

    // Build conversation history context
    const conversationContext = messageHistory.length > 0
      ? messageHistory
          .slice(-8)
          .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n')
      : '';

    // Initialize streaming LLM
    const llm = new ChatOpenAI({
      modelName: HANDBOOK_CONFIG.models.chat,
      temperature: HANDBOOK_CONFIG.models.temperature,
      maxTokens: HANDBOOK_CONFIG.models.maxTokens,
      apiKey: process.env.OPENAI_API_KEY,
      streaming: true,
    });

    // Construct synthesis prompt
    const systemPrompt = SYSTEM_PROMPTS.answerSynthesis(context, conversationContext);
    
    const userPrompt = `Based on the handbook context provided, please answer this question:

"${currentQuery}"

Remember to:
- Use only information from the provided context
- Include inline citations [1], [2], etc.
- Be clear about any limitations in the available information
- Maintain continuity with the conversation history if relevant`;

    // Stream answer
    let fullAnswer = '';

    const stream = await llm.stream([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    for await (const chunk of stream) {
      const content = chunk.content as string;
      if (content) {
        fullAnswer += content;
        onChunk(content);
      }
    }

    console.log('[synthesizeAnswerStreaming] Answer generated successfully:', {
      length: fullAnswer.length,
      chunks_used: retrievedChunks.length,
    });

    return {
      synthesizedAnswer: fullAnswer,
    };
  } catch (error) {
    console.error('[synthesizeAnswerStreaming] Error:', error);
    return {
      error: `Failed to synthesize answer: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

