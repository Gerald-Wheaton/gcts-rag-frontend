import OpenAI from 'openai';
import { HANDBOOK_CONFIG } from '@/lib/langgraph/config';
import type { HandbookGraphStateType, PartialHandbookState } from '@/lib/langgraph/state';

/**
 * Query Embedder Node
 * 
 * Generates vector embedding for semantic search using OpenAI's text-embedding-3-large
 * 
 * @param state - Current graph state
 * @returns Partial state with analyzedQuery updated with embedding
 */
export async function embedQuery(state: HandbookGraphStateType): Promise<PartialHandbookState> {
  try {
    const { analyzedQuery, currentQuery, messageHistory } = state;

    // Validate input
    if (!analyzedQuery) {
      return {
        error: 'No analyzed query available for embedding',
      };
    }

    if (!process.env.OPENAI_API_KEY) {
      return {
        error: 'OpenAI API key is not configured',
      };
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build embedding text with conversation context if relevant
    let embeddingText = currentQuery;

    // Add recent conversation context for better semantic search
    // Only include if there are recent messages that might provide context
    if (messageHistory.length > 0) {
      const recentContext = messageHistory
        .slice(-2) // Last 2 messages for embedding context
        .filter(msg => msg.role === 'user') // Only user messages
        .map(msg => msg.content)
        .join(' ');
      
      if (recentContext) {
        embeddingText = `${recentContext} ${currentQuery}`;
      }
    }

    // Generate embedding with retry logic
    let embedding: number[] | null = null;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < HANDBOOK_CONFIG.retry.maxAttempts; attempt++) {
      try {
        const response = await openai.embeddings.create({
          model: HANDBOOK_CONFIG.models.embedding,
          input: embeddingText,
          encoding_format: 'float',
        });

        embedding = response.data[0].embedding;
        break;
      } catch (error) {
        lastError = error as Error;
        
        // Check if it's a rate limit error
        if (error instanceof Error && error.message.includes('rate_limit')) {
          const delayMs = HANDBOOK_CONFIG.retry.initialDelayMs * Math.pow(
            HANDBOOK_CONFIG.retry.backoffMultiplier,
            attempt
          );
          
          console.log(`[embedQuery] Rate limited, retrying in ${delayMs}ms (attempt ${attempt + 1}/${HANDBOOK_CONFIG.retry.maxAttempts})`);
          
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          // Non-rate-limit error, don't retry
          throw error;
        }
      }
    }

    if (!embedding) {
      throw lastError || new Error('Failed to generate embedding after retries');
    }

    // Validate embedding dimension (should be 3072 for text-embedding-3-large)
    if (embedding.length !== 3072) {
      return {
        error: `Unexpected embedding dimension: ${embedding.length} (expected 3072)`,
      };
    }

    console.log('[embedQuery] Embedding generated successfully');

    // Update analyzedQuery with embedding
    const updatedAnalyzedQuery = {
      ...analyzedQuery,
      embedding,
    };

    return {
      analyzedQuery: updatedAnalyzedQuery,
    };
  } catch (error) {
    console.error('[embedQuery] Error:', error);
    return {
      error: `Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

