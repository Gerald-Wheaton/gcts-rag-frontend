import { ChatOpenAI } from '@langchain/openai';
import { HANDBOOK_CONFIG, SYSTEM_PROMPTS } from '@/lib/langgraph/config';
import { ClarificationOutputSchema } from '@/types/langgraph';
import type { HandbookGraphStateType, PartialHandbookState } from '@/lib/langgraph/state';

/**
 * Clarification Handler Node
 * 
 * Generates helpful clarification question when user query is ambiguous
 * Provides options when multiple interpretations exist
 * 
 * @param state - Current graph state
 * @returns Partial state with clarificationRequest
 */
export async function requestClarification(state: HandbookGraphStateType): Promise<PartialHandbookState> {
  try {
    const { currentQuery, analyzedQuery } = state;

    // Validate input
    if (!analyzedQuery) {
      return {
        error: 'No analyzed query available for clarification',
      };
    }

    if (!analyzedQuery.requiresClarification) {
      console.log('[requestClarification] Clarification not needed, skipping');
      return {};
    }

    console.log('[requestClarification] Generating clarification request');

    // Initialize LLM with structured output
    const llm = new ChatOpenAI({
      modelName: HANDBOOK_CONFIG.models.chat,
      temperature: 0.4, // Slightly higher for friendly, helpful tone
      apiKey: process.env.OPENAI_API_KEY,
    }).withStructuredOutput(ClarificationOutputSchema);

    // Determine reason for clarification
    const reason = analyzedQuery.clarificationReason || 
      (analyzedQuery.confidence < HANDBOOK_CONFIG.ambiguity.confidenceThreshold
        ? `The query has low confidence (${analyzedQuery.confidence.toFixed(2)})`
        : 'The query is ambiguous');

    // Construct clarification prompt
    const prompt = SYSTEM_PROMPTS.clarificationRequest(currentQuery, reason);

    // Generate clarification
    const clarification = await llm.invoke(prompt);

    // Validate response
    const validatedClarification = ClarificationOutputSchema.parse(clarification);

    // Build clarification request text
    let clarificationText = validatedClarification.clarification_question;

    // Add options if provided
    if (validatedClarification.suggested_options && 
        validatedClarification.suggested_options.length > 0) {
      clarificationText += '\n\nPlease specify:\n';
      validatedClarification.suggested_options.forEach((option, idx) => {
        clarificationText += `${idx + 1}. ${option}\n`;
      });
    }

    console.log('[requestClarification] Clarification generated:', {
      hasOptions: validatedClarification.suggested_options?.length || 0,
      reason,
    });

    return {
      clarificationRequest: clarificationText,
      requiresClarification: true,
    };
  } catch (error) {
    console.error('[requestClarification] Error:', error);
    
    // Fallback to generic clarification
    const fallbackClarification = 
      `I need some clarification to better answer your question: "${state.currentQuery}"\n\n` +
      `Could you please provide more context or be more specific about what you're looking for in the handbook?`;

    return {
      clarificationRequest: fallbackClarification,
      requiresClarification: true,
    };
  }
}

