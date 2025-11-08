import { ChatOpenAI } from '@langchain/openai';
import { HANDBOOK_CONFIG, SYSTEM_PROMPTS } from '@/lib/langgraph/config';
import { RelevanceScoringOutputSchema } from '@/types/langgraph';
import type { HandbookGraphStateType, PartialHandbookState } from '@/lib/langgraph/state';

/**
 * Reranker Node
 * 
 * Uses LLM to score relevance of retrieved chunks and reorders them
 * Keeps top N chunks for synthesis
 * 
 * @param state - Current graph state
 * @returns Partial state with reranked retrievedChunks
 */
export async function rerankChunks(state: HandbookGraphStateType): Promise<PartialHandbookState> {
  try {
    const { retrievedChunks, currentQuery, analyzedQuery } = state;

    // Validate input
    if (!retrievedChunks || retrievedChunks.length === 0) {
      console.log('[rerankChunks] No chunks to rerank');
      return {
        retrievedChunks: [],
      };
    }

    if (!analyzedQuery) {
      return {
        error: 'No analyzed query available for reranking',
      };
    }

    // If we have few chunks, skip reranking
    if (retrievedChunks.length <= 3) {
      console.log('[rerankChunks] Too few chunks to rerank, using original order');
      return {}; // No changes needed
    }

    console.log(`[rerankChunks] Reranking ${retrievedChunks.length} chunks`);

    // Initialize LLM with structured output
    const llm = new ChatOpenAI({
      modelName: HANDBOOK_CONFIG.models.chat,
      temperature: 0.1, // Very low temperature for consistent scoring
      apiKey: process.env.OPENAI_API_KEY,
    }).withStructuredOutput(RelevanceScoringOutputSchema);

    // Prepare chunks for scoring (truncate for token efficiency)
    const chunkPreviews = retrievedChunks.map((chunk, idx) => ({
      index: idx,
      preview: chunk.content.substring(0, 300), // First 300 chars
      section: chunk.section_path,
    }));

    // Construct scoring prompt
    const chunksText = chunkPreviews
      .map(c => `[${c.index}] Section: ${c.section}\nContent: ${c.preview}...`)
      .join('\n\n');

    const prompt = SYSTEM_PROMPTS.relevanceScoring(
      `${analyzedQuery.intent}: ${currentQuery}`,
      chunkPreviews.map(c => c.preview)
    ) + `\n\nProvide relevance scores (0-10) for each chunk based on the query.`;

    // Call LLM for scoring
    const scoringResult = await llm.invoke(prompt);

    // Validate response
    const validatedScoring = RelevanceScoringOutputSchema.parse(scoringResult);

    // Apply scores to chunks
    const rerankedChunks = retrievedChunks.map((chunk, idx) => {
      const scoreEntry = validatedScoring.chunk_scores.find(s => s.index === idx);
      return {
        ...chunk,
        relevance_score: scoreEntry?.relevance_score || 0,
      };
    });

    // Sort by relevance score (descending)
    rerankedChunks.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

    // Keep top K chunks for synthesis
    const topChunks = rerankedChunks.slice(0, HANDBOOK_CONFIG.retrieval.rerankTopK);

    console.log('[rerankChunks] Reranking complete:', {
      originalCount: retrievedChunks.length,
      keptCount: topChunks.length,
      avgRelevanceScore: topChunks.reduce((sum, c) => sum + (c.relevance_score || 0), 0) / topChunks.length,
    });

    return {
      retrievedChunks: topChunks,
    };
  } catch (error) {
    console.error('[rerankChunks] Error:', error);
    
    // On error, return original chunks (fallback gracefully)
    console.log('[rerankChunks] Falling back to original chunk order');
    return {};
  }
}

